import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { nextDueDate, isoDate, daysUntil } from '../../shared/onepay.ts';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_ATTEMPTS = 3;

function rfc2047(s) {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(String(s))))}?=`;
}
function b64utf8(s) {
  return btoa(unescape(encodeURIComponent(String(s))));
}

function reminderEmail(title, merchant, amount, currency, due, overdue, appUrl, subjectPrefix) {
  const subject = `${subjectPrefix}OnePay reminder: ${title} — ${currency} ${amount} due on ${due}`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#0F172A">
      <h2 style="margin:0 0 4px">Payment reminder from OnePay</h2>
      <p style="color:#64748B;margin:0 0 16px">${overdue ? 'This payment is overdue.' : 'A payment is coming up.'}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748B">Item</td><td align="right"><strong>${title}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748B">Provider</td><td align="right">${merchant || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B">Amount</td><td align="right"><strong>${currency} ${amount}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748B">Due date</td><td align="right">${due}</td></tr>
      </table>
      ${appUrl ? `<p style="margin:24px 0"><a href="${appUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open OnePay</a></p>` : ''}
      <p style="color:#94A3B8;font-size:12px">Sent by OnePay — your bill and subscription hub. OnePay never debits your account.</p>
    </div>`;
  return { subject, html };
}

// Sends through the connected Gmail account when possible, otherwise OnePay's mail service.
async function sendReminderEmail(base44, to, item, appUrl, subjectPrefix = '') {
  const { subject, html } = reminderEmail(item.title, item.merchant, item.amount, item.currency, item.due, item.overdue, appUrl, subjectPrefix);
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('gmail');
    const raw = ['To: ' + to, 'From: me', 'Subject: ' + rfc2047(subject), 'MIME-Version: 1.0', 'Content-Type: text/html; charset="UTF-8"', '', html].join('\r\n');
    const res = await fetch(`${GMAIL_API}/messages/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64utf8(raw) }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true, channel: 'gmail', detail: `Gmail accepted the message (${res.status})` };
  } catch { /* fall through to the app mail service */ }
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, from_name: 'OnePay', subject, html });
    return { ok: true, channel: 'sendemail', detail: 'Sent via OnePay mail' };
  } catch (e) {
    return { ok: false, channel: 'none', detail: e.message };
  }
}

function parseOffsets(raw) {
  const parts = String(raw || '').split(',').map((s) => parseInt(String(s).trim(), 10)).filter((n) => n >= 0 && n <= 30);
  const unique = [...new Set(parts)].sort((a, b) => b - a);
  return unique.length > 0 ? unique : [7, 3, 1];
}

function stageFor(dLeft, offsets, windowDays) {
  if (dLeft < 0) return 'overdue';
  if (dLeft === 0) return 'due_today';
  for (const o of offsets) {
    if (dLeft === o) {
      if (o === windowDays) return 'window'; // legacy key — avoids double reminders
      return o === 1 ? 'one_day' : `d${o}`;   // legacy keys for 1 day
    }
  }
  if (dLeft === windowDays) return 'window';
  return null;
}

function attemptsOf(log) {
  const m = (log?.detail || '').match(/attempt (\d+)/);
  return m ? Number(m[1]) : 1;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Runs either by an admin (manual / test runs from Settings) or with no user
    // context at all (scheduled workflow trigger). Regular users are rejected.
    let user = null;
    try { user = await base44.auth.me(); } catch { /* scheduled run — no user context */ }
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    if (body && body.test && !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const appUrl = (req.headers.get('X-Base44-App-Url') || '').replace(/\/+$/, '');

    // ---- Test email: sends one real sample reminder immediately, no bills touched ----
    if (body && body.test) {
      const sample = {
        title: 'Sample renewal (test)', merchant: 'Sample Provider', amount: 499, currency: 'INR',
        due: isoDate(new Date(Date.now() + 7 * 86400000)), overdue: false,
      };
      const res = await sendReminderEmail(base44, user.email, sample, appUrl, 'TEST — ');
      await base44.asServiceRole.entities.DeliveryLog.create({
        key: `remail:test:${user.id}:${Date.now()}`, channel: 'email',
        status: res.ok ? 'sent' : 'failed', detail: `Test to ${user.email} — ${res.detail}`,
        sent_at: new Date().toISOString(),
      });
      return Response.json({ test: true, sent: res.ok, channel: res.channel, detail: res.detail });
    }

    const now = new Date();
    const today = isoDate(now);
    const todayKey = today.slice(0, 7);

    // Active bills and subscriptions across all users (service role — background sweep).
    const [billsPage, subsPage] = await Promise.all([
      base44.asServiceRole.entities.Bill.filter({ status: 'active' }, { limit: 200 }),
      base44.asServiceRole.entities.Subscription.filter({ status: 'active' }, { limit: 200 }),
    ]);
    const bills = billsPage.items ?? billsPage;
    const subs = subsPage.items ?? subsPage;
    if (bills.length === 0 && subs.length === 0) {
      return Response.json({ date: today, notifications: 0, emails: 0, skipped: 0, summary: 'No active bills or subscriptions' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const emailByUser = Object.fromEntries(users.map((u) => [u.id, u.email]));
    const settingsPage = await base44.asServiceRole.entities.AppSetting.filter({}, { limit: 200 });
    const settingsByUser = {};
    for (const s of settingsPage.items ?? settingsPage) settingsByUser[s.created_by_id] = s;

    const dueByUser = {};      // digest rows (bills)
    const emailJobs = [];      // per-item reminder emails (bills + subscriptions)
    let notifications = 0;
    let skipped = 0;

    const processItem = async (item, kind) => {
      const due = nextDueDate(kind === 'bill' ? item.due_date : item.next_renewal_date, kind === 'bill' ? item.billing_cycle : item.billing_interval, now);
      if (!due) { skipped++; return; }
      const dueIso = isoDate(due);
      const ownerId = item.created_by_id;
      const settings = settingsByUser[ownerId] || {};
      const windowDays = Math.max(0, Math.min(30, Number(settings.reminder_window_days ?? 3)));
      const offsets = parseOffsets(settings.reminder_offsets);

      if (kind === 'bill') {
        if (item.last_paid_date && item.last_paid_date >= dueIso) { skipped++; return; }
        if (item.snoozed_until && item.snoozed_until > today) { skipped++; return; }
        if (item.dismissed_cycle === dueIso) { skipped++; return; }
      }

      const dLeft = daysUntil(dueIso, now);
      const stage = stageFor(dLeft, offsets, windowDays);
      if (!stage) return;
      const isOverdue = dLeft < 0;

      // In-app notification — idempotent per (item, cycle, stage).
      const key = `rem:${kind === 'bill' ? 'b' : 's'}:${item.id}:${dueIso}:${stage}`;
      const logPage = await base44.asServiceRole.entities.DeliveryLog.filter({ key }, { limit: 1 });
      if ((logPage.items ?? logPage).length > 0) return; // already delivered

      const title = isOverdue ? `Overdue: ${item.title || item.plan_name}` : dLeft === 0 ? `Due today: ${item.title || item.plan_name}` : `Upcoming: ${item.title || item.plan_name}`;
      const text = isOverdue
        ? `${item.title || item.plan_name} (${item.merchant}) was due on ${dueIso}.`
        : `${item.title || item.plan_name} (${item.merchant}) is due on ${dueIso}${dLeft === 1 ? ' — tomorrow' : ''}.`;

      await base44.asServiceRole.entities.Notification.create({
        title, body: text,
        category: kind === 'subscription' ? 'renewal' : (isOverdue ? 'overdue' : 'due_soon'),
        read: false,
        related_type: kind,
        related_id: item.id,
      });
      await base44.asServiceRole.entities.DeliveryLog.create({
        key, channel: 'notification', status: 'sent', detail: title, sent_at: new Date().toISOString(),
      });
      notifications++;

      if (kind === 'bill') {
        dueByUser[ownerId] = dueByUser[ownerId] || [];
        dueByUser[ownerId].push({ title: item.title, merchant: item.merchant, amount: item.amount, currency: item.currency || 'INR', due: dueIso, overdue: isOverdue, autopay: !!item.autopay });
      }

      // Per-item reminder email at each configured offset (and overdue), never duplicated.
      if (settings.email_reminders_enabled && emailByUser[ownerId]) {
        const emailKey = `remail:${kind === 'bill' ? 'b' : 's'}:${item.id}:${dueIso}:${stage}`;
        const priorPage = await base44.asServiceRole.entities.DeliveryLog.filter({ key: emailKey }, { limit: 1 });
        const prior = (priorPage.items ?? priorPage)[0];
        if (prior && (prior.status === 'sent' || attemptsOf(prior) >= MAX_ATTEMPTS)) return;
        emailJobs.push({
          key: emailKey, ownerId, to: emailByUser[ownerId], priorId: prior?.id || null, priorAttempts: prior ? attemptsOf(prior) : 0,
          item: { title: item.title || item.plan_name, merchant: item.merchant, amount: item.amount, currency: item.currency || 'INR', due: dueIso, overdue: isOverdue },
        });
      }
    };

    for (const bill of bills) await processItem(bill, 'bill');
    for (const sub of subs) await processItem(sub, 'subscription');

    // Send per-item emails in batches of 6; log success or failure honestly.
    let emails = 0, failed = 0;
    for (let i = 0; i < emailJobs.length; i += 6) {
      const batch = emailJobs.slice(i, i + 6);
      const results = await Promise.allSettled(batch.map((job) => sendReminderEmail(base44, job.to, job.item, appUrl)));
      for (let j = 0; j < batch.length; j++) {
        const job = batch[j];
        const r = results[j];
        const attempt = job.priorAttempts + 1;
        const outcome = r.status === 'fulfilled' ? r.value : { ok: false, channel: 'none', detail: r.reason?.message || 'send error' };
        const log = {
          channel: 'email',
          status: outcome.ok ? 'sent' : 'failed',
          detail: `${outcome.channel} → ${job.to} — ${outcome.detail}; attempt ${attempt}`,
          sent_at: outcome.ok ? new Date().toISOString() : null,
        };
        if (job.priorId) await base44.asServiceRole.entities.DeliveryLog.update(job.priorId, log);
        else await base44.asServiceRole.entities.DeliveryLog.create({ key: job.key, ...log });
        if (outcome.ok) emails++; else failed++;
      }
    }

    // One digest email per user per day, only when digest is enabled.
    for (const [ownerId, dueBills] of Object.entries(dueByUser)) {
      const settings = settingsByUser[ownerId] || {};
      if (!settings.digest_enabled) continue;
      const email = emailByUser[ownerId];
      if (!email) continue;

      const key = `digest:${ownerId}:${todayKey}:${today}`;
      const logPage = await base44.asServiceRole.entities.DeliveryLog.filter({ key }, { limit: 1 });
      if ((logPage.items ?? logPage).length > 0) continue;

      const rows = dueBills.map((b) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${b.title}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${b.merchant}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${b.currency} ${b.amount}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${b.due}</td></tr>`
      ).join('');
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          from_name: 'OnePay',
          subject: `OnePay: ${dueBills.length} payment(s) need your attention`,
          html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#0F172A">Payments due in your reminder window</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px">
              <tr><th align="left" style="padding:8px 12px">Bill</th><th align="left" style="padding:8px 12px">Merchant</th><th align="left" style="padding:8px 12px">Amount</th><th align="left" style="padding:8px 12px">Due</th></tr>
              ${rows}
            </table>
            ${appUrl ? `<p style="margin:16px 0"><a href="${appUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open OnePay</a></p>` : ''}
            <p style="color:#64748B;font-size:13px">Opened in OnePay — every bill, renewal and EMI tracked in one place.</p>
          </div>`,
        });
        await base44.asServiceRole.entities.DeliveryLog.create({
          key, channel: 'email', status: 'sent', detail: `Digest to ${email}`, sent_at: new Date().toISOString(),
        });
        emails++;
      } catch (e) {
        await base44.asServiceRole.entities.DeliveryLog.create({
          key, channel: 'email', status: 'failed', detail: `Digest to ${email}: ${e.message}`,
        });
        failed++;
      }
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      action: 'reminder_sweep', entity_type: 'job',
      detail: `date=${today} notifications=${notifications} emails=${emails} failed=${failed} skipped=${skipped}`,
    });

    return Response.json({ date: today, bills_checked: bills.length, subs_checked: subs.length, notifications, emails, failed, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}