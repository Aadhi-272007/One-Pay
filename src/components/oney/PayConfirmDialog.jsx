import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney, nextDueDate, toDateInput } from "@/lib/money";
import { recordPaymentFor } from "@/lib/actions";

// Shared confirmation modal for recording a payment from any page (Bills,
// Subscriptions, Reminders, Calendar). It ONLY records the payment in OnePay —
// it never debits an account or talks to any payment provider.
//
// `record` must be normalized to: { id, title, merchant, amount, currency,
// category, billing_cycle, due_date }. For target="subscription" the next
// renewal date is advanced here after the payment is recorded.
export default function PayConfirmDialog({ record, target = "bill", onClose, onDone }) {
  const open = !!record;
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (record) setPayDate(new Date().toISOString().slice(0, 10));
  }, [record?.id]);

  const confirm = async () => {
    if (!record || busy) return;
    setBusy(true);
    try {
      await recordPaymentFor(record, payDate, "bill", "", target);
      if (target === "subscription") {
        const next = nextDueDate(record.due_date, record.billing_cycle, new Date(payDate + "T12:00:00"));
        if (next) await base44.entities.Subscription.update(record.id, { next_renewal_date: toDateInput(next) });
      }
      toast({
        title: "Payment recorded",
        description: record.billing_cycle === "one-time"
          ? `${record.title} marked paid and completed.`
          : `${record.title} marked paid — next due date scheduled.`,
      });
      onClose?.();
      onDone?.();
    } catch (e) {
      toast({ title: "Could not record the payment", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm payment for {record ? record.title : ""}</DialogTitle>
          <DialogDescription>
            {record
              ? `${formatMoney(record.amount, record.currency)} paid by you on ${payDate}. OnePay logs this payment and schedules the next due date — it never debits your account itself.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Paid on</label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          {record?.payment_method && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Payment method: {record.payment_method}</p>
          )}
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={confirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Mark as paid
          </Button>
          <p className="text-center text-xs text-slate-400">Pay Now only records the payment here — it never debits your account.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}