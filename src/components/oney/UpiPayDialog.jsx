import { useEffect, useState } from "react";
import {
  Loader2, Smartphone, ShieldCheck, Copy, CheckCircle2,
  Clock, XCircle, ChevronLeft, Landmark,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney, nextDueDate, toDateInput } from "@/lib/money";
import { triggerCalendarSync } from "@/lib/autoSync";
import {
  UPI_APPS, isValidUpiId, isMobileDevice, newUpiRef, buildUpiUri, launchUpiApp,
} from "@/lib/upi";

// Real UPI payment flow. Pay Now builds a genuine UPI intent (NPCI standard)
// to the bill's UPI ID, opens the chosen UPI app on mobile or shows a scannable
// QR on desktop, and records the attempt as PENDING. OnePay never debits an
// account and never confirms on its own: the payment is marked settled ONLY
// after the user enters the real UTR from their UPI app and it isn't a
// duplicate. Pending, failed and cancelled attempts are stored as such.
//
// `record` is normalized to { id, title, merchant, amount, currency, category,
// billing_cycle, due_date, upi_id }. target="subscription" advances the next
// renewal date on verified success.
export default function UpiPayDialog({ record, target = "bill", onClose, onDone }) {
  const open = !!record;
  const [phase, setPhase] = useState("select"); // select | mobile | qr
  const [vpa, setVpa] = useState("");
  const [vpaEditing, setVpaEditing] = useState(false);
  const [payment, setPayment] = useState(null);
  const [qrUri, setQrUri] = useState("");
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const mobile = isMobileDevice();

  useEffect(() => {
    if (record) {
      setPhase("select");
      setVpa(record.upi_id || "");
      setVpaEditing(false);
      setPayment(null);
      setQrUri("");
      setUtr("");
      setBusy(false);
      setCopied(false);
    }
  }, [record?.id]);

  const vpaOk = isValidUpiId(vpa);

  const start = async (app) => {
    if (!record || busy) return;
    if (!vpaOk) { setVpaEditing(true); return; }
    setBusy(true);
    try {
      const ref = newUpiRef();
      const created = await base44.entities.Payment.create({
        bill_id: target === "bill" ? (record.id || "") : "",
        title: record.title,
        merchant: record.merchant,
        amount: Number(record.amount),
        currency: record.currency || "INR",
        paid_date: new Date().toISOString().slice(0, 10),
        category: record.category || "Other",
        status: "pending",
        reference: ref,
        upi_ref: ref,
        upi_vpa: vpa.trim(),
        source: "upi",
      });
      setPayment(created);
      const uri = buildUpiUri(
        { vpa, name: record.merchant || record.title, amount: record.amount, reference: ref, note: record.title },
        app.scheme,
      );
      if (mobile) {
        launchUpiApp(uri); // app-specific intent; user picks another app below if it didn't open
        setPhase("mobile");
      } else {
        setQrUri(buildUpiUri({ vpa, name: record.merchant || record.title, amount: record.amount, reference: ref, note: record.title }));
        setPhase("qr");
      }
    } catch (e) {
      toast({ title: "Could not start the payment", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Marks the pending attempt settled ONLY with a real UTR that isn't already
  // recorded. Returning from the UPI app alone never settles anything.
  const verify = async () => {
    const id = (utr || "").trim();
    if (!payment || busy) return;
    if (id.length < 6) {
      toast({ title: "Enter the UPI transaction ID (UTR)", description: "Find it in your UPI app under transaction details.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const dup = await base44.entities.Payment.filter({ reference: id, status: "settled" }, { limit: 1 });
      if ((dup.items ?? dup).length > 0) {
        toast({ title: "Duplicate transaction", description: "This UTR is already recorded as settled.", variant: "destructive" });
        return;
      }
      const payDate = new Date().toISOString().slice(0, 10);
      await base44.entities.Payment.update(payment.id, { status: "settled", reference: id, paid_date: payDate });
      if (target === "bill") {
        const patch = { last_paid_date: payDate };
        if (record.billing_cycle === "one-time" && record.status === "active") patch.status = "completed";
        if (record.billing_cycle !== "one-time" && record.status === "active") {
          const next = nextDueDate(record.due_date, record.billing_cycle, new Date(payDate + "T12:00:00"));
          if (next) patch.due_date = toDateInput(next);
        }
        await base44.entities.Bill.update(record.id, patch);
      } else {
        const next = nextDueDate(record.due_date, record.billing_cycle, new Date(payDate + "T12:00:00"));
        if (next) await base44.entities.Subscription.update(record.id, { next_renewal_date: toDateInput(next) });
      }
      await base44.entities.AuditEvent.create({
        action: "upi_payment_verified",
        entity_type: target,
        entity_id: record.id,
        detail: `${record.title} — UTR ${id} verified by user`,
      });
      toast({ title: "Payment verified", description: `${record.title} marked paid with UTR ${id}.` });
      triggerCalendarSync();
      onClose?.();
      onDone?.();
    } catch (e) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const fail = async () => {
    if (!payment || busy) return;
    setBusy(true);
    try {
      await base44.entities.Payment.update(payment.id, { status: "failed" });
      onClose?.();
    } catch (e) {
      toast({ title: "Could not update the attempt", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{phase === "select" ? "Pay with UPI" : "Waiting for payment"}</DialogTitle>
          <DialogDescription>
            {record ? `${record.title} · ${formatMoney(record.amount, record.currency || "INR")}` : ""}
          </DialogDescription>
        </DialogHeader>

        {phase === "select" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Merchant UPI ID</label>
              {vpaOk && !vpaEditing ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <span className="truncate text-sm text-slate-900 dark:text-slate-100">{vpa}</span>
                  <button type="button" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-300" onClick={() => setVpaEditing(true)}>Change</button>
                </div>
              ) : (
                <Input
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder="e.g. bescomkolar@kbl"
                  autoFocus={vpaEditing}
                  onBlur={() => vpa.trim() !== "" && setVpaEditing(false)}
                />
              )}
              {!vpaOk && vpa !== "" && <p className="text-xs text-amber-600 dark:text-amber-400">Enter a valid UPI ID in name@bank format.</p>}
              {vpa === "" && <p className="text-xs text-slate-500 dark:text-slate-400">Copy it from the bill or the merchant's payment page. OnePay only sends it to your UPI app.</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {UPI_APPS.map((app) => (
                <button key={app.id} type="button" disabled={busy} onClick={() => start(app)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${app.tone}`}>
                    <Smartphone className="h-4 w-4" />
                  </span>
                  {app.name}
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
              <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
                OnePay opens your UPI app with the amount pre-filled — you approve the payment there. It is marked paid only after you confirm the real transaction ID (UTR); returning to OnePay alone is never treated as success.
              </p>
            </div>
          </div>
        )}

        {phase === "qr" && (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <QRCodeSVG value={qrUri} size={190} />
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Scan with any UPI app — {formatMoney(record.amount, record.currency || "INR")} to {vpa}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={copyLink}>
              {copied ? <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? "UPI link copied" : "Copy UPI link"}
            </Button>
            <VerifyBlock utr={utr} setUtr={setUtr} busy={busy} verify={verify} fail={fail} back={() => setPhase("select")} />
          </div>
        )}

        {phase === "mobile" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                Payment is <span className="font-semibold">pending</span> — nothing is marked paid yet. If {record.merchant || "the merchant"} didn't open, pick another UPI app on the previous screen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {UPI_APPS.filter((a) => a.id !== "any").map((app) => (
                <Button key={app.id} variant="outline" disabled={busy} onClick={() => start(app)}>
                  <Smartphone className="mr-1.5 h-4 w-4" /> {app.name}
                </Button>
              ))}
            </div>
            <VerifyBlock utr={utr} setUtr={setUtr} busy={busy} verify={verify} fail={fail} back={() => setPhase("select")} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VerifyBlock({ utr, setUtr, busy, verify, fail, back }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <Landmark className="h-3.5 w-3.5" /> Verify the transaction
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Open your UPI app → transaction details → copy the UPI transaction ID (UTR). OnePay marks this bill paid only after the UTR is recorded.
      </p>
      <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 425178932014" inputMode="numeric" />
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={verify}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />} Verify & mark paid
      </Button>
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-300">
          <ChevronLeft className="h-3.5 w-3.5" /> Choose another app
        </button>
        <button type="button" onClick={fail} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 dark:text-slate-400">
          <XCircle className="h-3.5 w-3.5" /> Payment failed or cancelled
        </button>
      </div>
    </div>
  );
}