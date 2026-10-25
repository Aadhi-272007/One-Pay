import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, CATEGORIES, CYCLES } from "@/components/oney/constants";
import { triggerCalendarSync } from "@/lib/autoSync";

const EMPTY = {
  title: "", merchant: "", amount: "", currency: "INR", due_date: "", billing_cycle: "monthly",
  category: "Subscriptions", status: "active", payment_method: "", upi_id: "", account_details: "", autopay: false,
  notes: "", attachment_uri: "",
};

export default function BillDialog({ open, onOpenChange, bill, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm(bill ? {
        ...EMPTY,
        ...Object.fromEntries(Object.entries(bill).filter(([k]) => k in EMPTY)),
      } : EMPTY);
    }
  }, [open, bill]);

  const upload = async (file) => {
    if (!file) return;
    const ok = ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type);
    if (!ok || file.size > 5 * 1024 * 1024) {
      alert("Receipt must be PNG, JPG, WEBP or PDF, up to 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      set("attachment_uri", file_uri);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.due_date) return;
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (bill) await base44.entities.Bill.update(bill.id, payload);
      else await base44.entities.Bill.create(payload);
      onOpenChange(false);
      onSaved?.();
      triggerCalendarSync();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{bill ? "Edit payment" : "Add payment"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Electricity bill" required />
            </div>
            <div className="space-y-1.5">
              <Label>Merchant</Label>
              <Input value={form.merchant} onChange={(e) => set("merchant", e.target.value)} placeholder="e.g. BESCOM" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Billing cycle</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => set("billing_cycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "paused", "completed"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Input value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} placeholder="e.g. UPI · HDFC card" />
            </div>
            <div className="space-y-1.5">
              <Label>Merchant UPI ID (for Pay Now)</Label>
              <Input value={form.upi_id} onChange={(e) => set("upi_id", e.target.value)} placeholder="e.g. bescom@kbl" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>AutoPay account details (where it is debited from)</Label>
              <Input value={form.account_details} onChange={(e) => set("account_details", e.target.value)} placeholder="e.g. HDFC ••4821" />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">AutoPay at merchant</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Debited automatically — OnePay still reminds you.</p>
              </div>
              <Switch checked={form.autopay} onCheckedChange={(v) => set("autopay", v)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything worth remembering" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Receipt (PNG, JPG, PDF — max 5 MB, stored privately)</Label>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {form.attachment_uri ? "Replace file" : "Upload receipt"}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                </label>
                {form.attachment_uri && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
              </div>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : bill ? "Save changes" : "Save payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}