// Shared recurring-payment math used by backend functions.

export function monthlyEquivalent(amount, cycle) {
  const a = Number(amount) || 0;
  switch (cycle) {
    case "weekly": return (a * 52) / 12;
    case "monthly": return a;
    case "quarterly": return a / 3;
    case "annual": return a / 12;
    default: return 0;
  }
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

export function daysUntil(dateValue, now = new Date()) {
  const d = parseDate(dateValue);
  if (!d) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// Next due date for a bill whose recorded due date has passed (or is still ahead).
export function nextDueDate(dateValue, cycle, now = new Date()) {
  const base = parseDate(dateValue);
  if (!base) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (cycle === "one-time" || !cycle) return base.getTime() >= today.getTime() ? base : null;
  const d = new Date(base.getTime());
  let guard = 0;
  const step = cycle === "weekly" ? 7 : cycle === "monthly" ? 1 : cycle === "quarterly" ? 3 : 12;
  const unit = cycle === "weekly" ? "day" : "month";
  while (d.getTime() < today.getTime() && guard < 600) {
    if (unit === "day") d.setUTCDate(d.getUTCDate() + step);
    else d.setUTCMonth(d.getUTCMonth() + step);
    guard++;
  }
  // Clamp month-end overflow (e.g. Jan 31 rolled to Mar 3) back into the intended month.
  if (unit === "month") {
    const day = base.getUTCDate();
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    if (d.getUTCDate() !== day && d.getUTCDate() < 12) d.setUTCDate(Math.min(day, lastDay));
  }
  return d;
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Creates the financial record a Gmail suggestion describes. Shared by
// confirmSuggestion (user confirms) and gmailSync (high-confidence auto-add).
export async function createRecordFromSuggestion(base44: any, s: any) {
  const base: any = {
    merchant: s.merchant,
    currency: s.currency || 'INR',
    gmail_message_id: s.gmail_message_id,
  };
  if (s.kind === 'subscription') {
    return base44.entities.Subscription.create({
      ...base,
      plan_name: s.subject ? s.subject.slice(0, 80) : s.merchant,
      amount: s.amount,
      billing_interval: 'monthly',
      next_renewal_date: s.due_date || new Date().toISOString().slice(0, 10),
      category: 'Subscriptions',
      status: 'active',
      autopay: false,
    });
  }
  if (s.kind === 'expense') {
    return base44.entities.Expense.create({
      ...base,
      title: s.subject ? s.subject.slice(0, 80) : s.merchant,
      amount: s.amount,
      date: s.invoice_date || new Date().toISOString().slice(0, 10),
      category: 'Other',
    });
  }
  return base44.entities.Bill.create({
    ...base,
    title: s.subject ? s.subject.slice(0, 80) : s.merchant,
    amount: s.amount,
    due_date: s.due_date || new Date().toISOString().slice(0, 10),
    billing_cycle: 'monthly',
    category: 'Subscriptions',
    status: 'active',
    autopay: false,
  });
}