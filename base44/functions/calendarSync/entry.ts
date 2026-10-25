import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { nextDueDate, isoDate } from '../../shared/onepay.ts';

const CAL_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const PROP_KEY = 'onepay_bill_id';
const SUB_PROP_KEY = 'onepay_sub_id';
const HORIZON_DAYS = 120;
const MAX_ITEMS = 25;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let connection;
    try {
      connection = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    } catch {
      await upsertState(base44, user.id, { connected: false });
      return Response.json({ connected: false, reason: 'not_connected' });
    }
    const auth = { Authorization: `Bearer ${connection.accessToken}`, 'Content-Type': 'application/json' };
    const now = new Date();

    // Records that exist right now (any status) — used for orphan detection.
    const [allBillsPage, allSubsPage] = await Promise.all([
      base44.entities.Bill.filter({}, { limit: 200 }),
      base44.entities.Subscription.filter({}, { limit: 200 }),
    ]);
    const allBills = allBillsPage.items ?? allBillsPage;
    const allSubs = allSubsPage.items ?? allSubsPage;
    const billById = new Map(allBills.map((b) => [b.id, b]));
    const subById = new Map(allSubs.map((s) => [s.id, s]));

    let added = 0, updated = 0, removed = 0, errors = 0;

    const syncBills = async () => {
      const bills = allBills.filter((b) => b.status === 'active' && b.due_date).slice(0, MAX_ITEMS);
      for (const bill of bills) {
        const due = nextDueDate(bill.due_date, bill.billing_cycle, now);
        if (!due) continue;
        const daysAhead = Math.round((due.getTime() - now.getTime()) / 86400000);
        if (daysAhead > HORIZON_DAYS) continue;

        const target = isoDate(due);
        const filterUrl = `${CAL_API}?privateExtendedProperty=${encodeURIComponent(`${PROP_KEY}=${bill.id}`)}&maxResults=5`;
        const listRes = await fetch(filterUrl, { headers: auth, signal: AbortSignal.timeout(10000) });
        if (!listRes.ok) {
          errors++;
          await markStatus(base44, base44.entities.Bill, bill, 'error', `Calendar API error ${listRes.status}`);
          continue;
        }
        const list = await listRes.json();
        const existing = (list.items || [])[0];
        const summary = `${bill.title} — ${(bill.currency || 'INR')} ${bill.amount}`;
        const props = { private: { [PROP_KEY]: bill.id, onepay_due: target } };

        let ok = false;
        if (!existing) {
          const created = await fetch(CAL_API, {
            method: 'POST', headers: auth, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              summary,
              start: { date: target },
              end: { date: isoDate(new Date(due.getTime() + 86400000)) },
              transparency: 'transparent',
              reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }] },
              extendedProperties: props,
            }),
          });
          ok = created.ok;
          if (ok) added++;
        } else if (existing.start?.date !== target || existing.summary !== summary) {
          const patched = await fetch(`${CAL_API}/${existing.id}`, {
            method: 'PATCH', headers: auth, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ summary, start: { date: target }, end: { date: isoDate(new Date(due.getTime() + 86400000)) }, extendedProperties: props }),
          });
          ok = patched.ok;
          if (ok) updated++;
        } else {
          ok = true; // already correct — idempotent, no duplicate created
        }
        if (ok) await markStatus(base44, base44.entities.Bill, bill, 'synced', null);
        else {
          errors++;
          await markStatus(base44, base44.entities.Bill, bill, 'error', 'Google Calendar rejected the event');
        }
      }
    };

    const syncSubs = async () => {
      const subs = allSubs.filter((s) => s.status === 'active' && s.next_renewal_date).slice(0, MAX_ITEMS);
      for (const sub of subs) {
        const renewal = nextDueDate(sub.next_renewal_date, sub.billing_interval, now);
        if (!renewal) continue;
        const daysAhead = Math.round((renewal.getTime() - now.getTime()) / 86400000);
        if (daysAhead > HORIZON_DAYS) continue;

        const target = isoDate(renewal);
        const filterUrl = `${CAL_API}?privateExtendedProperty=${encodeURIComponent(`${SUB_PROP_KEY}=${sub.id}`)}&maxResults=5`;
        const listRes = await fetch(filterUrl, { headers: auth, signal: AbortSignal.timeout(10000) });
        if (!listRes.ok) {
          errors++;
          await markStatus(base44, base44.entities.Subscription, sub, 'error', `Calendar API error ${listRes.status}`);
          continue;
        }
        const list = await listRes.json();
        const existing = (list.items || [])[0];
        const summaryText = `${sub.plan_name} (${sub.merchant}) — ${(sub.currency || 'INR')} ${sub.amount}`;
        const props = { private: { [SUB_PROP_KEY]: sub.id, onepay_due: target } };

        let ok = false;
        if (!existing) {
          const created = await fetch(CAL_API, {
            method: 'POST', headers: auth, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              summary: summaryText,
              start: { date: target },
              end: { date: isoDate(new Date(renewal.getTime() + 86400000)) },
              transparency: 'transparent',
              reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }] },
              extendedProperties: props,
            }),
          });
          ok = created.ok;
          if (ok) added++;
        } else if (existing.start?.date !== target || existing.summary !== summaryText) {
          const patched = await fetch(`${CAL_API}/${existing.id}`, {
            method: 'PATCH', headers: auth, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ summary: summaryText, start: { date: target }, end: { date: isoDate(new Date(renewal.getTime() + 86400000)) }, extendedProperties: props }),
          });
          ok = patched.ok;
          if (ok) updated++;
        } else {
          ok = true;
        }
        if (ok) await markStatus(base44, base44.entities.Subscription, sub, 'synced', null);
        else {
          errors++;
          await markStatus(base44, base44.entities.Subscription, sub, 'error', 'Google Calendar rejected the event');
        }
      }
    };

    // Remove calendar events whose bill/subscription no longer exists (deleted records).
    const cleanupOrphans = async () => {
      const timeMin = new Date(now.getTime() - 30 * 86400000).toISOString();
      const timeMax = new Date(now.getTime() + HORIZON_DAYS * 86400000).toISOString();
      const listUrl = `${CAL_API}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250&singleEvents=true`;
      const evRes = await fetch(listUrl, { headers: auth, signal: AbortSignal.timeout(10000) });
      if (!evRes.ok) return;
      const events = (await evRes.json()).items || [];
      for (const ev of events) {
        const priv = ev.extendedProperties?.private || {};
        const bk = priv[PROP_KEY];
        const sk = priv[SUB_PROP_KEY];
        if (!bk && !sk) continue;
        // Alive = record exists and should still have an event (completed bills, and
        // cancelled/expired subscriptions, lose their events).
        const bill = bk ? billById.get(bk) : null;
        const sub = sk ? subById.get(sk) : null;
        const alive = (bill && bill.status !== 'completed') || (sub && sub.status !== 'cancelled' && sub.status !== 'expired');
        if (alive) continue;
        const del = await fetch(`${CAL_API}/${ev.id}`, { method: 'DELETE', headers: auth, signal: AbortSignal.timeout(10000) });
        if (del.ok || del.status === 410 || del.status === 404) removed++;
      }
    };

    await Promise.all([syncBills(), syncSubs()]);
    await cleanupOrphans();

    const summary = `${added} added · ${updated} updated · ${removed} removed${errors ? ` · ${errors} failed` : ''}`;
    await upsertState(base44, user.id, {
      connected: true,
      last_sync_at: new Date().toISOString(),
      last_error: errors > 0 ? `${errors} item(s) failed to sync` : null,
      last_result: summary,
    });
    await base44.entities.AuditEvent.create({ action: 'calendar_sync', entity_type: 'integration', detail: summary });

    return Response.json({ connected: true, added, updated, removed, errors, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function markStatus(base44, entity, record, status, errorText) {
  if (record.calendar_status === status && !errorText) return;
  const patch = { calendar_status: status, calendar_error: errorText || null };
  try {
    await entity.update(record.id, patch);
  } catch { /* status tracking must never break the sync itself */ }
}

async function upsertState(base44, userId, patch) {
  const page = await base44.entities.IntegrationState.filter({ kind: 'calendar' }, { limit: 1 });
  const existing = (page.items ?? page)[0];
  if (existing) return base44.entities.IntegrationState.update(existing.id, patch);
  return base44.entities.IntegrationState.create({ kind: 'calendar', ...patch });
}