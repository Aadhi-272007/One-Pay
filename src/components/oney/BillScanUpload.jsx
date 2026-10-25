import { useState } from "react";
import { Loader2, Upload, AlertTriangle, FileScan, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES, CATEGORIES, CYCLES } from "@/components/oney/constants";
import { triggerCalendarSync } from "@/lib/autoSync";

const EMPTY = {
  title: "", merchant: "", amount: "", currency: "INR", due_date: "",
  billing_cycle: "monthly", category: "Other", payment_method: "",
};

// Upload a bill or invoice photo/PDF, let AI extract provider, amount and due
// date, then show a review form before saving it as a tracked bill.
export default function BillScanUpload({ onSaved }) {
  const [extracting, setExtracting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [fileUri, setFileUri] = useState(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const { toast } = useToast();

  const handleUpload = async (file) => {
    if (!file) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      toast({ title: "Unsupported file", description: "Use a PDF, JPG, PNG or screenshot up to 8 MB.", variant: "destructive" });
      return;
    }
    setExtracting(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
      const res = await base44.functions.invoke("extractBill", { file_url: signed_url });
      const d = res.data;
      if (d.error) {
        toast({ title: "Could not read the bill", description: d.error, variant: "destructive" });
        return;
      }
      if (!d.provider && !d.amount) {
        toast({ title: "Nothing recognizable", description: "The AI could not find bill details in this file — try a clearer photo or enter it manually.", variant: "destructive" });
        return;
      }
      setForm({
        title: d.title || d.plan_name || d.provider || "",
        merchant: d.provider || "",
        amount: d.amount ?? "",
        currency: d.currency || "INR",
        due_date: d.next_renewal_date || "",
        billing_cycle: d.billing_cycle || "monthly",
        category: d.category || "Other",
        payment_method: d.payment_method || "",
      });
      setFileUri(file_uri);
      setLowConfidence((Number(d.confidence) || 0) < 0.6);
      // Duplicate detection: same provider and amount already tracked (active or paused).
      try {
        const page = await base44.entities.Bill.filter({}, { limit: 200 });
        const existing = ((page.items ?? page)).filter((b) => b.status === "active" || b.status === "paused");
        const match = existing.find((b) =>
          (b.merchant || "").trim().toLowerCase() === (d.provider || "").trim().toLowerCase() &&
          b.merchant && Math.abs(Number(b.amount) - Number(d.amount || 0)) < 0.01
        );
        setDuplicate(match ? { title: match.title, amount: match.amount, due_date: match.due_date } : null);
      } catch { setDuplicate(null); }
      setReviewOpen(true);
    } catch (e) {
      toast({ title: "Could not read the bill", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.due_date) return;
    setSaving(true);
    try {
      await base44.entities.Bill.create({ ...form, amount: Number(form.amount), status: "active", attachment_uri: fileUri || "" });
      triggerCalendarSync();
      setReviewOpen(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={extracting} onClick={(e) => e.preventDefault()}>
          {extracting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileScan className="mr-1 h-4 w-4" />}
          {extracting ? "Reading bill…" : "Upload bill"}
        </Button>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review extracted bill</DialogTitle>
            <DialogDescription>Check what the AI read from your file, fix anything wrong, then save.</DialogDescription>
          </DialogHeader>
          {lowConfidence && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              The AI was unsure about some fields — please double-check them before saving.
            </div>
          )}
          {duplicate && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
              <Copy className="mt-0.5 h-4 w-4 shrink-0" />
              Possible duplicate: “{duplicate.title}” ({duplicate.amount}, due {duplicate.due_date}) is already tracked. Check the fields below, then save only if this is a new bill.
            </div>
          )}
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. Electricity bill" /></div>
              <div className="space-y-1.5"><Label>Provider</Label><Input value={form.merchant} onChange={(e) => set("merchant", e.target.value)} placeholder="e.g. BESCOM" /></div>
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} required /></div>
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => set("billing_cycle", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label>Payment method</Label><Input value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} placeholder="e.g. UPI · HDFC card" /></div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Upload className="h-3.5 w-3.5" /> Original file is attached to this bill (stored privately).</p>
            <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save bill"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}