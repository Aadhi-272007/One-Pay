import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || '').trim().slice(0, 1000);
    if (!question) return Response.json({ error: 'Ask a question first' }, { status: 400 });

    const [billsPage, subsPage, payPage, expPage, setPage] = await Promise.all([
      base44.entities.Bill.filter({ status: 'active' }, { limit: 100 }),
      base44.entities.Subscription.filter({}, { limit: 100 }),
      base44.entities.Payment.filter({}, { sort: '-paid_date', limit: 200 }),
      base44.entities.Expense.filter({}, { sort: '-date', limit: 200 }),
      base44.entities.AppSetting.filter({}, { limit: 1 }),
    ]);
    const bills = billsPage.items ?? billsPage;
    const subs = subsPage.items ?? subsPage;
    const payments = payPage.items ?? payPage;
    const expenses = expPage.items ?? expPage;
    const settings = (setPage.items ?? setPage)[0] || {};
    const currency = settings.currency || 'INR';

    // Compact, real-data snapshot for the model. Nothing invented; only these records.
    const monthOf = (d) => String(d || '').slice(0, 7);
    const months = {};
    for (const p of payments) if ((p.status || 'settled') === 'settled') {
      const k = monthOf(p.paid_date); if (!k) continue;
      months[k] = months[k] || { total: 0, count: 0 };
      months[k].total += Number(p.amount || 0); months[k].count++;
    }
    for (const e of expenses) {
      const k = monthOf(e.date); if (!k) continue;
      months[k] = months[k] || { total: 0, count: 0 };
      months[k].total += Number(e.amount || 0); months[k].count++;
    }
    const monthlyTotals = Object.entries(months).sort().slice(-6)
      .map(([k, v]) => ({ month: k, total: Math.round(v.total), payments: v.count }));
    const settledTotal = payments.filter((p) => (p.status || 'settled') === 'settled')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const snapshot = {
      currency,
      monthly_target: settings.monthly_target || null,
      active_bills: bills.map((b) => ({ title: b.title, merchant: b.merchant, amount: b.amount, due_date: b.due_date, cycle: b.billing_cycle, category: b.category, autopay: !!b.autopay })),
      subscriptions: subs.filter((s) => s.status !== 'cancelled').map((s) => ({ plan: s.plan_name, merchant: s.merchant, amount: s.amount, interval: s.billing_interval, next_renewal: s.next_renewal_date, trial_end: s.trial_end_date || null, status: s.status })),
      recent_payments: payments.slice(0, 40).map((p) => ({ title: p.title, merchant: p.merchant, amount: p.amount, status: p.status || 'settled', paid_date: p.paid_date, category: p.category, source: p.source })),
      recent_expenses: expenses.slice(0, 40).map((e) => ({ title: e.title, merchant: e.merchant, amount: e.amount, date: e.date, category: e.category })),
      monthly_settled_totals: monthlyTotals,
      lifetime_settled_total: Math.round(settledTotal),
      today: new Date().toISOString().slice(0, 10),
    };

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'You are OnePay\'s finance assistant. You answer questions about ONE person\'s bills, subscriptions, payments and expenses using ONLY the JSON snapshot below.\n' +
        'Rules:\n' +
        '- Every number you mention must come from the snapshot. If the data cannot answer the question, say exactly what data would be needed and do not guess.\n' +
        '- Any forward-looking statement (forecast, saving suggestion) must be labelled "estimate".\n' +
        '- Be concrete and brief: 2-5 sentences, plain text, no markdown headings. Reference real item names.\n' +
        '- Answer in the same language as the question.\n' +
        '- Amounts: use the currency symbol or code from the snapshot (default INR / ₹).\n\n' +
        'USER QUESTION: ' + question + '\n\n' +
        'SNAPSHOT:\n' + JSON.stringify(snapshot),
      response_json_schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
      },
    });

    return Response.json({ answer: llm?.answer || 'Sorry — the assistant could not answer right now. Please try again.', data_points: bills.length + subs.length + payments.length + expenses.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}