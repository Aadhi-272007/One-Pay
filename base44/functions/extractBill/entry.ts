import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const CYCLES = ['weekly', 'monthly', 'quarterly', 'annual', 'one-time'];
const CATEGORIES = ['Utilities', 'Subscriptions', 'Telecom', 'Internet', 'Insurance', 'EMI', 'Rent', 'Credit Card', 'Entertainment', 'Health', 'Education', 'Other'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = String(body?.file_url || '');
    if (!/^https?:\/\//.test(fileUrl)) {
      return Response.json({ error: 'Upload a bill image or PDF first' }, { status: 400 });
    }

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'You are an accurate bill and invoice data extractor. This file is a photo, screenshot or PDF of a bill, invoice or subscription renewal notice.\n' +
        'Extract exactly what is visible, never invent values — use null for anything you cannot see:\n' +
        '- provider: the company issuing the bill (e.g. BESCOM, Airtel, Netflix)\n' +
        '- plan_name: the plan or subscription name if it is a recurring service, otherwise a short title for the bill\n' +
        '- amount: the total amount due, a positive number (use the final payable amount)\n' +
        '- currency: ISO currency code as printed (default INR if not shown)\n' +
        '- billing_cycle: one of weekly, monthly, quarterly, annual, one-time (one-time if no recurring schedule is implied)\n' +
        '- next_renewal_date: the due date or next renewal date, normalized to YYYY-MM-DD (null if not visible)\n' +
        '- category: the closest of ' + CATEGORIES.join(', ') + '\n' +
        '- payment_method: if visible (e.g. "UPI", "credit card", "autopay mandate"), else null\n' +
        '- kind: "subscription" if this is a recurring service renewal, otherwise "bill"\n' +
        '- confidence: 0-1, how sure you are overall',
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          plan_name: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          billing_cycle: { type: 'string' },
          next_renewal_date: { type: 'string' },
          category: { type: 'string' },
          payment_method: { type: 'string' },
          kind: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    const d = llm || {};
    const cycle = String(d.billing_cycle || 'monthly').toLowerCase().replace(/\s+/g, '-');
    const dueDate = d.next_renewal_date && /^\d{4}-\d{2}-\d{2}/.test(String(d.next_renewal_date))
      ? String(d.next_renewal_date).slice(0, 10)
      : (d.next_renewal_date && !isNaN(new Date(String(d.next_renewal_date)).getTime())
        ? new Date(String(d.next_renewal_date)).toISOString().slice(0, 10)
        : '');

    return Response.json({
      provider: d.provider || '',
      plan_name: d.plan_name || '',
      title: d.plan_name || d.provider || '',
      amount: Number(d.amount) || null,
      currency: (d.currency || 'INR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'INR',
      billing_cycle: CYCLES.includes(cycle) ? cycle : 'monthly',
      next_renewal_date: dueDate,
      category: CATEGORIES.includes(d.category) ? d.category : 'Other',
      payment_method: d.payment_method || '',
      kind: d.kind === 'subscription' ? 'subscription' : 'bill',
      confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0.5)),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}