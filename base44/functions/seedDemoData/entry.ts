import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Seeds demo data for the CURRENTLY LOGGED-IN user, so they can explore the
// dashboard on a populated account. Ownership is stamped to the caller.
// Refuses to run if the account already has bills, so real data is never mixed with demo data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const existingBills = await base44.entities.Bill.filter({}, { limit: 1 });
    if ((existingBills.items ?? existingBills).length > 0) {
      return Response.json({ error: 'This account already has bills — demo data is only loaded on a fresh account.' }, { status: 409 });
    }

    await base44.entities.Bill.bulkCreate([
      { title: 'Electricity Bill', merchant: 'TNEB', amount: 1850.5, currency: 'INR', due_date: '2026-10-28', billing_cycle: 'monthly', category: 'Utilities', status: 'active', autopay: false },
      { title: 'Broadband', merchant: 'ACT Fibernet', amount: 799, currency: 'INR', due_date: '2026-10-30', billing_cycle: 'monthly', category: 'Internet', status: 'active', autopay: true },
      { title: 'Credit Card Bill', merchant: 'ICICI Bank', amount: 12400, currency: 'INR', due_date: '2026-11-05', billing_cycle: 'monthly', category: 'Credit Card', status: 'active', autopay: false },
      { title: 'House Rent', merchant: 'Landlord', amount: 15000, currency: 'INR', due_date: '2026-11-01', billing_cycle: 'monthly', category: 'Housing', status: 'active', autopay: true },
      { title: 'Car Insurance Premium', merchant: 'Bajaj Allianz', amount: 8500, currency: 'INR', due_date: '2026-11-15', billing_cycle: 'annual', category: 'Insurance', status: 'active', autopay: false },
      { title: 'Water Bill', merchant: 'Municipal Corporation', amount: 250, currency: 'INR', due_date: '2026-10-20', billing_cycle: 'monthly', category: 'Utilities', status: 'active', autopay: false },
      { title: 'Newspaper Subscription', merchant: 'The Hindu', amount: 350, currency: 'INR', due_date: '2026-11-08', billing_cycle: 'monthly', category: 'Subscriptions', status: 'active', autopay: false },
    ]);

    await base44.entities.Subscription.bulkCreate([
      { plan_name: 'Premium 4K', merchant: 'Netflix', amount: 649, currency: 'INR', billing_interval: 'monthly', next_renewal_date: '2026-10-26', category: 'Entertainment', status: 'active', autopay: true },
      { plan_name: 'Premium Individual', merchant: 'Spotify', amount: 119, currency: 'INR', billing_interval: 'monthly', next_renewal_date: '2026-11-02', category: 'Entertainment', status: 'active', autopay: true },
      { plan_name: 'Prime Membership', merchant: 'Amazon', amount: 1499, currency: 'INR', billing_interval: 'annual', next_renewal_date: '2026-12-10', category: 'Shopping', status: 'active', autopay: true },
      { plan_name: 'Premium', merchant: 'YouTube', amount: 149, currency: 'INR', billing_interval: 'monthly', next_renewal_date: '2026-10-29', category: 'Entertainment', status: 'active', autopay: false },
      { plan_name: 'Pro Annual', merchant: 'Notion', amount: 4000, currency: 'INR', billing_interval: 'annual', next_renewal_date: '2026-11-25', category: 'Productivity', status: 'active', autopay: false },
    ]);

    await base44.entities.Payment.bulkCreate([
      { title: 'House Rent', merchant: 'Landlord', amount: 15000, currency: 'INR', paid_date: '2026-10-01', category: 'Housing', status: 'settled', source: 'bill', reference: 'DEMO-RENT-OCT' },
      { title: 'Water Bill', merchant: 'Municipal Corporation', amount: 240, currency: 'INR', paid_date: '2026-10-20', category: 'Utilities', status: 'settled', source: 'bill', reference: 'DEMO-WATER-OCT' },
      { title: 'Newspaper Subscription', merchant: 'The Hindu', amount: 350, currency: 'INR', paid_date: '2026-10-08', category: 'Subscriptions', status: 'settled', source: 'bill', reference: 'DEMO-NEWS-OCT' },
      { title: 'Electricity Bill', merchant: 'TNEB', amount: 1780, currency: 'INR', paid_date: '2026-09-28', category: 'Utilities', status: 'settled', source: 'bill', reference: 'DEMO-ELEC-SEP' },
      { title: 'Broadband', merchant: 'ACT Fibernet', amount: 799, currency: 'INR', paid_date: '2026-09-30', category: 'Internet', status: 'settled', source: 'bill', reference: 'DEMO-BB-SEP' },
      { title: 'Credit Card Bill', merchant: 'ICICI Bank', amount: 9800, currency: 'INR', paid_date: '2026-09-05', category: 'Credit Card', status: 'settled', source: 'bill', reference: 'DEMO-CC-SEP' },
      { title: 'House Rent', merchant: 'Landlord', amount: 15000, currency: 'INR', paid_date: '2026-09-01', category: 'Housing', status: 'settled', source: 'bill', reference: 'DEMO-RENT-SEP' },
      { title: 'Electricity Bill', merchant: 'TNEB', amount: 1650, currency: 'INR', paid_date: '2026-08-28', category: 'Utilities', status: 'settled', source: 'bill', reference: 'DEMO-ELEC-AUG' },
      { title: 'Broadband', merchant: 'ACT Fibernet', amount: 799, currency: 'INR', paid_date: '2026-08-30', category: 'Internet', status: 'settled', source: 'bill', reference: 'DEMO-BB-AUG' },
      { title: 'House Rent', merchant: 'Landlord', amount: 15000, currency: 'INR', paid_date: '2026-08-01', category: 'Housing', status: 'settled', source: 'bill', reference: 'DEMO-RENT-AUG' },
    ]);

    await base44.entities.Expense.bulkCreate([
      { title: 'Groceries', merchant: 'BigBasket', amount: 2300, currency: 'INR', date: '2026-10-05', category: 'Groceries', notes: 'Monthly stock-up' },
      { title: 'Fuel', merchant: 'Indian Oil', amount: 1500, currency: 'INR', date: '2026-10-12', category: 'Transport', notes: 'Full tank' },
      { title: 'Movie tickets', merchant: 'PVR', amount: 600, currency: 'INR', date: '2026-10-18', category: 'Entertainment', notes: 'Weekend outing' },
      { title: 'Coffee', merchant: 'Starbucks', amount: 450, currency: 'INR', date: '2026-10-21', category: 'Food', notes: 'Team catch-up' },
    ]);

    await base44.entities.Notification.bulkCreate([
      { title: 'Overdue bill', body: 'Water Bill (₹250) was due on 20 Oct and is still unpaid.', category: 'overdue', read: false, related_type: 'bill' },
      { title: 'Renewal tomorrow', body: 'Netflix Premium (₹649) renews on 26 Oct.', category: 'renewal', read: false, related_type: 'subscription' },
      { title: 'Due in 4 days', body: 'Electricity Bill (₹1,850.50) is due on 28 Oct.', category: 'due_soon', read: false, related_type: 'bill' },
    ]);

    await base44.entities.AppSetting.create({ currency: 'INR', reminder_window_days: 7, reminder_offsets: '7,3,1', email_reminders_enabled: false, monthly_target: 25000, digest_enabled: false, timezone: 'Asia/Kolkata', locale: 'en-IN', theme: 'system' });

    // Verify ownership stamp landed on the caller.
    const check = await base44.entities.Bill.filter({}, { limit: 1 });
    const sample = (check.items ?? check)[0] || {};
    return Response.json({
      ok: true,
      owner_id: sample.created_by_id || null,
      caller_id: user.id,
      summary: '7 bills, 5 subscriptions, 10 payments, 4 expenses, 3 notifications and settings created. October settled total: payments ₹15,590 + expenses ₹4,850 = ₹20,440.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}