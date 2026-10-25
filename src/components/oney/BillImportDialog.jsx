import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, CATEGORIES, SUB_INTERVALS } from "@/components/oney/constants";
import { triggerCalendarSync } from "@/lib/autoSync";

const EMPTY = {
  plan_name: "", merchant: "", amount: "", currency: "INR", billing_interval: "monthly",
  next_renewal_date: "", category: "Subscriptions", payment_method: "", autopay: false,
};

// Review-and-edit dialog for AI-extracted bill data before it is saved as a subscription.
export default function BillImportDialog({ open, onOpenChange, initial, existingSubs, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [forceSave, setForceSave] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open && initial) {
      setForm({ ...EMPTY, ...initial, amount: initial.amount ?? "" });
      setForceSave(false);
    }
  }, [open, initial]);

  const valid =
    form.plan_name.trim() !== "" &&
    Number(form.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.next_renewal_date || "");

  // Duplicate detection: same provider with the same plan name or the same amount.
  const duplicates = existingSubs.filter((s) =>
    (s.merchant || "").toLowerCase().trim() === (form.merchant || "").toLowerCase().trim() &&
    (s.plan_name || "").toLowerCase().trim() === (form.plan_name || "").toLowerCase().trim()
  );

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await base44.entities.Subscription.create({
        plan_name: form.plan_name.trim(),
        merchant: form.merchant.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        billing_interval: form.billing_interval,
        next_renewal_date: form.next_renewal_date,
        category: form.category,
        status: "active",
        autopay: form.autopay,
        notes: form.payment_method ? `Payment method: ${form.payment_method}` : "",
      });
      triggerCalendarSync();
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review extracted details</DialogTitle>
          <DialogDescription>Check what the AI read from your bill, fix anything wrong, then save.</DialogDescription>
        </DialogHeader>
        {duplicates.length > 0 && !forceSave && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs text-amber-700 dark:text-amber-300">
              This looks like <strong>{duplicates[0].plan_name}</strong> from {duplicates[0].merchant}, already tracked. Keep editing or save anyway.
              <button className="mt-1 block font-semibold underline" onClick={() => setForceSave(true)}>Save anyway</button>
            </div>
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Plan name</Label><Input value={form.plan_name} onChange={(e) => set("plan_name", e.target.value)} required placeholder="e.g. Netflix Premium" /></div>
            <div className="space-y-1.5"><Label>Provider</Label><Input value={form.merchant} onChange={(e) => set("merchant", e.target.value)} placeholder="e.g. Netflix" /></div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing cycle</Label>
              <Select value={form.billing_interval} onValueChange={(v) => set("billing_interval", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUB_INTERVALS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Next renewal date</Label><Input type="date" value={form.next_renewal_date} onChange={(e) => set("next_renewal_date", e.target.value)} required /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Payment method</Label><Input value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} placeholder="e.g. UPI · card" /></div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-renews with merchant</p>
              <Switch checked={form.autopay} onCheckedChange={(v) => set("autopay", v)} />
            </div>
          </div>
          <Button type="submit" disabled={saving || !valid || (duplicates.length > 0 && !forceSave)} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save subscription"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}