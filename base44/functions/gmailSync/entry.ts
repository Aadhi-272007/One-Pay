import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isoDate, parseDate, createRecordFromSuggestion } from '../../shared/onepay.ts';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SEARCH_QUERY = "(invoice OR \"payment due\" OR bill OR statement OR renewal OR subscription OR receipt) newer_than:45d";
const MAX_SCAN = 40;

function header(msg, name) {
  const h = (msg.payload?.headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Connection — shared Gmail connector (builder's account, read-only scope).
    let connection;
    try {
      connection = await base44.asServiceRole.connectors.getConnection('gmail');
    } catch {
      await upsertState(base44, user.id, { connected: false, last_error: null });
      return Response.json({ connected: false, reason: 'not_connected' });
    }
    const auth = { Authorization: `Bearer ${connection.accessToken}` };

    // 2. Load sync state for this user.
    const statePage = await base44.entities.IntegrationState.filter({ kind: 'gmail' }, { limit: 1 });
    const state = (statePage.items ?? statePage)[0] || null;

    // 3. Collect candidate message ids: incremental history first, initial search as fallback.
    let messageIds = [];
    let mode = 'initial_search';
    let newCursor = null;

    const profileRes = await fetch(`${GMAIL_API}/profile`, { headers: auth, signal: AbortSignal.timeout(10000) });
    if (!profileRes.ok) {
      const errText = profileRes.status === 401 || profileRes.status === 403 ? 'Gmail permission revoked or expired' : `Gmail API error ${profileRes.status}`;
      await upsertState(base44, user.id, { connected: false, last_error: errText });
      return Response.json({ connected: false, error: errText });
    }
    const profile = await profileRes.json();
    newCursor = String(profile.historyId);

    if (state?.cursor) {
      const histRes = await fetch(`${GMAIL_API}/history?startHistoryId=${state.cursor}&historyTypes=messageAdded&maxResults=100`, { headers: auth, signal: AbortSignal.timeout(10000) });
      if (histRes.ok) {
        const hist = await histRes.json();
        for (const rec of hist.history || []) {
          for (const m of rec.messagesAdded || []) {
            if (m.message?.id) messageIds.push(m.message.id);
          }
        }
        mode = 'incremental';
      } else if (histRes.status !== 404 && histRes.status !== 400) {
        // Real failure (rate limit / revoked) — keep old cursor, surface error.
        const errText = histRes.status === 401 || histRes.status === 403 ? 'Gmail permission revoked or expired' : `Gmail history error ${histRes.status}`;
        await upsertState(base44, user.id, { connected: true, last_error: errText });
        return Response.json({ connected: false, error: errText });
      }
      // 404/400 = cursor expired → fall through to initial search below.
    }

    if (messageIds.length === 0 && mode === 'initial_search') {
      let pageToken = '';
      for (let page = 0; page < 3 && messageIds.length < MAX_SCAN; page++) {
        const url = `${GMAIL_API}/messages?q=${encodeURIComponent(SEARCH_QUERY)}&maxResults=25${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const res = await fetch(url, { headers: auth, signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
          const errText = res.status === 401 || res.status === 403 ? 'Gmail permission revoked or expired' : `Gmail search error ${res.status}`;
          await upsertState(base44, user.id, { connected: true, last_error: errText });
          return Response.json({ connected: false, error: errText });
        }
        const data = await res.json();
        messageIds.push(...(data.messages || []).map((m) => m.id));
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
    }

    messageIds = [...new Set(messageIds)].slice(0, MAX_SCAN);

    // 4. Existing message ids — never re-suggest the same email.
    const [knownSuggestions, knownBills] = await Promise.all([
      base44.entities.GmailSuggestion.filter({}, { limit: 200 }),
      base44.entities.Bill.filter({}, { limit: 200 }),
    ]);
    const known = new Set([
      ...(knownSuggestions.items ?? knownSuggestions).map((s) => s.gmail_message_id),
      ...(knownBills.items ?? knownBills).map((b) => b.gmail_message_id),
    ]);

    // 5. Fetch full messages (batches of 6).
    const fetched = [];
    for (let i = 0; i < messageIds.length; i += 6) {
      const batch = messageIds.slice(i, i + 6);
      const results = await Promise.allSettled(batch.map((id) =>
        fetch(`${GMAIL_API}/messages/${id}?format=full`, { headers: auth, signal: AbortSignal.timeout(10000) })
          .then((r) => (r.ok ? r.json() : null))
      ));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) fetched.push(r.value);
      }
    }

    const candidates = [];
    for (const msg of fetched) {
      const id = msg.id;
      if (known.has(id)) continue;
      const subject = header(msg, 'Subject');
      const from = header(msg, 'From');
      const snippet = (msg.snippet || '').slice(0, 400);
      if (!subject && !snippet) continue;
      candidates.push({ message_id: id, thread_id: msg.threadId, from, subject, snippet, internal_date: msg.internalDate });
    }

    // 6. Extract structured data in one LLM call (treat email content as untrusted input).
    let extracted = [];
    if (candidates.length > 0) {
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt:
          'You are a careful billing extractor. Below are email snippets from a personal inbox. ' +
          'For each email decide whether it is genuinely about a bill, invoice, subscription payment/renewal, or receipt. ' +
          'Extract the merchant, the amount with currency, invoice/payment date, and the due/renewal date when present. ' +
          'Dates must be YYYY-MM-DD or null. Amount must be a positive number or null. ' +
          'kind is one of: bill, subscription, expense. confidence 0-1. ' +
          'Ignore marketing, newsletters, OTP and non-financial emails (is_bill_related=false). Do not guess missing amounts.\n\n' +
          JSON.stringify(candidates, null, 1),
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message_id: { type: 'string' },
                  merchant: { type: 'string' },
                  subject: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  invoice_date: { type: 'string' },
                  due_date: { type: 'string' },
                  kind: { type: 'string' },
                  confidence: { type: 'number' },
                  is_bill_related: { type: 'boolean' },
                },
              },
            },
          },
        },
      });
      extracted = (llmRes?.items || []).filter((e) => e.is_bill_related && e.amount > 0 && e.message_id);
    }

    // 7. Store pending suggestions.
    const toCreate = extracted.slice(0, 20).map((e) => {
      const c = candidates.find((c) => c.message_id === e.message_id) || {};
      return {
        gmail_message_id: e.message_id,
        thread_id: c.thread_id || '',
        merchant: e.merchant || c.from || 'Unknown merchant',
        subject: e.subject || c.subject || '',
        amount: Number(e.amount),
        currency: (e.currency || 'INR').toUpperCase().slice(0, 5),
        invoice_date: e.invoice_date && parseDate(e.invoice_date) ? e.invoice_date.slice(0, 10) : null,
        due_date: e.due_date && parseDate(e.due_date) ? e.due_date.slice(0, 10) : null,
        kind: ['bill', 'subscription', 'expense'].includes(e.kind) ? e.kind : 'bill',
        status: 'pending',
        snippet: (c.snippet || '').slice(0, 300),
        confidence: Math.max(0, Math.min(1, Number(e.confidence) || 0.5)),
      };
    });
    let autoConfirmed = 0;
    if (toCreate.length > 0) {
      const existingPage = await base44.entities.GmailSuggestion.filter({}, { limit: 200 });
      const existingIds = new Set((existingPage.items ?? existingPage).map((s) => s.gmail_message_id));
      const fresh = toCreate.filter((t) => !existingIds.has(t.gmail_message_id));
      if (fresh.length > 0) {
        const rows = await base44.entities.GmailSuggestion.bulkCreate(fresh);
        // High-confidence bills/subscriptions go straight into the user's data;
        // the rest stay pending for review in Settings.
        for (const s of (Array.isArray(rows) ? rows : [])) {
          const dateKey = s.kind === 'expense' ? s.invoice_date : s.due_date;
          if ((s.confidence ?? 0) < 0.85 || !dateKey || !s.merchant) continue;
          try {
            const record = await createRecordFromSuggestion(base44, s);
            await base44.entities.GmailSuggestion.update(s.id, { status: 'confirmed' });
            await base44.entities.AuditEvent.create({
              action: 'suggestion_auto_confirmed', entity_type: s.kind, entity_id: record.id,
              detail: `${s.merchant} — ${s.currency} ${s.amount}`,
            });
            autoConfirmed++;
          } catch { /* stays pending for manual confirmation */ }
        }
      }
    }

    // 8. Save cursor only after everything succeeded.
    const summary = `Scanned ${fetched.length} message(s), ${toCreate.length} new (${autoConfirmed} auto-added) (${mode})`;
    await upsertState(base44, user.id, {
      connected: true,
      cursor: newCursor,
      last_sync_at: new Date().toISOString(),
      last_error: null,
      last_result: summary,
    });
    await base44.entities.AuditEvent.create({ action: 'gmail_sync', entity_type: 'integration', detail: summary });

    return Response.json({
      connected: true,
      mode,
      scanned: fetched.length,
      new_suggestions: toCreate.length,
      last_sync_at: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function upsertState(base44, userId, patch) {
  const page = await base44.entities.IntegrationState.filter({ kind: 'gmail' }, { limit: 1 });
  const existing = (page.items ?? page)[0];
  if (existing) return base44.entities.IntegrationState.update(existing.id, patch);
  return base44.entities.IntegrationState.create({ kind: 'gmail', ...patch });
}