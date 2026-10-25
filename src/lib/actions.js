import { base44 } from "@/api/base44Client";
import { nextDueDate, toDateInput } from "@/lib/money";
import { triggerCalendarSync } from "@/lib/autoSync";

// Record a settled payment for a bill (or subscription, with target="subscription"),
// then advance the bill's due date for the next cycle.
export async function recordPaymentFor(record, paidDate, source = "bill", reference = "", target = "bill") {
  const payment = await base44.entities.Payment.create({
    bill_id: target === "bill" ? (record.id || "") : "",
    title: record.title,
    merchant: record.merchant,
    amount: Number(record.amount),
    currency: record.currency || "INR",
    paid_date: paidDate,
    category: record.category || "Other",
    status: "settled",
    reference: reference || "",
    source,
  });

  // Only a real Bill gets its due date advanced here — subscription renewals
  // advance their own next_renewal_date in the Subscriptions page.
  if (target === "bill") {
    const patch = { last_paid_date: paidDate };
    if (record.billing_cycle === "one-time" && record.status === "active") {
      patch.status = "completed";
    }
    if (record.billing_cycle !== "one-time" && record.status === "active") {
      const next = nextDueDate(record.due_date, record.billing_cycle, new Date(paidDate + "T12:00:00"));
      if (next) patch.due_date = toDateInput(next);
    }
    await base44.entities.Bill.update(record.id, patch);
  }
  await base44.entities.AuditEvent.create({
    action: "payment_recorded",
    entity_type: target,
    entity_id: record.id,
    detail: `${record.title} — ${record.currency || "INR"} ${record.amount} on ${paidDate}`,
  });
  triggerCalendarSync();
  return payment;
}