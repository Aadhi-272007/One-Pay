import { useEffect, useState } from "react";
import { Plus, Clock, CheckCheck, Scale, Download, Search, Loader2, Trash2, XCircle, Upload, Undo2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { formatMoney, formatDate } from "@/lib/money";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CATEGORIES } from "@/components/oney/constants";

const EMPTY = { title: "", merchant: "", amount: "", paid_date: "", category: "Other", reference: "", notes: "" };

export default function History() {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("any");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptUp, setReceiptUp] = useState(false);
  const { toast } = useToast();

  const uploadReceipt = async (file) => {
    if (!file) return;
    setReceiptUp(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setReceipt(file_uri);
      toast({ title: "Receipt attached", description: "Stored privately — only your account can open it." });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setReceiptUp(false);
    }
  };

  const refund = async (p) => {
    const val = prompt(`Refund amount received back for "${p.title}" (${p.currency || "INR"}):`, String(Number(p.amount || 0)));
    if (val === null || !(Number(val) > 0)) return;
    await base44.entities.Payment.update(p.id, { refund_amount: Number(val), refund_date: new Date().toISOString().slice(0, 10) });
    await base44.entities.AuditEvent.create({ action: "payment_refunded", entity_type: "payment", entity_id: p.id, detail: `${p.title} — ${Number(val)} ${p.currency || "INR"}` });
    toast({ title: "Refund recorded", description: `${formatMoney(Number(val), p.currency)} back on ${formatDate(new Date().toISOString().slice(0, 10))}` });
    await load();
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("OnePay — payment history", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filtered.length} entries`, 14, 25);
    doc.setTextColor(0);
    let y = 34;
    filtered.forEach((p, i) => {
      if (y > 280) { doc.addPage(); y = 18; }
      const label = `${(p.paid_date || "").slice(0, 10)}  ${(p.title || "").slice(0, 38)}`;
      const right = `${p.currency || "INR"} ${Number(p.amount || 0).toFixed(2)}${p.refund_amount ? ` (refunded ${p.refund_amount})` : ""}${(p.status || "settled") !== "settled" ? ` [${p.status}]` : ""}`;
      doc.text(label, 14, y);
      doc.text(right, 200, y, { align: "right" });
      y += 6;
      if (i % 2 === 1) y += 1;
    });
    doc.save("onepay-history.pdf");
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, x] = await Promise.all([
        base44.entities.Payment.filter({}, { sort: "-paid_date", limit: 300 }),
        base44.entities.Expense.filter({}, { limit: 300 }),
      ]);
      setPayments(p.items ?? p);
      setExpenses(x.items ?? x);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Consolidated view: recorded payments plus standalone expenses.
  const rows = [
    ...payments.map((p) => ({ ...p, kind: "payment" })),
    ...expenses.map((e) => ({ ...e, paid_date: e.date, source: "expense", status: "settled", kind: "expense" })),
  ].sort((a, b) => (b.paid_date || "").localeCompare(a.paid_date || ""));

  const months = [...new Set(rows.map((p) => (p.paid_date || "").slice(0, 7)))].filter(Boolean).sort().reverse();

  const filtered = rows.filter((p) => {
    if (month !== "all" && !(p.paid_date || "").startsWith(month)) return false;
    if (category !== "all" && p.category !== category) return false;
    if (status !== "any" && (p.status || "settled") !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${p.title} ${p.merchant} ${p.reference || ""} ${p.notes || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const settledIn = filtered.filter((p) => (p.status || "settled") === "settled");
  const settledTotal = settledIn.reduce((s, p) => s + Number(p.amount || 0), 0);
  const average = settledIn.length ? settledTotal / settledIn.length : 0;

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.paid_date) return;
    setSaving(true);
    try {
      await base44.entities.Payment.create({ ...form, amount: Number(form.amount), status: "settled", source: "manual", attachment_uri: receipt || "" });
      toast({ title: "Payment logged" });
      setOpen(false);
      setForm(EMPTY);
      setReceipt(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete the recorded payment for "${p.title}"?`)) return;
    const entity = p.kind === "expense" ? base44.entities.Expense : base44.entities.Payment;
    await entity.delete(p.id);
    await load();
  };

  const exportCsv = () => {
    downloadCsv("onepay-history.csv", buildCsv(filtered, [
      { label: "Title", value: "title" }, { label: "Merchant", value: "merchant" },
      { label: "Amount", value: "amount" }, { label: "Currency", value: "currency" },
      { label: "Paid on", value: "paid_date" }, { label: "Category", value: "category" },
      { label: "Status", value: "status" }, { label: "Reference", value: "reference" },
      { label: "Source", value: "source" },
    ]));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment history</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every amount that has left — searchable, with the reference you may need later.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:text-orange-400" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:text-orange-400" onClick={exportPdf}><Download className="mr-1 h-4 w-4" /> PDF</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Log a payment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Showing" value={String(filtered.length)} sub={`${payments.length} payments · ${expenses.length} expenses recorded`} icon={Clock} tone="blue" />
        <MetricCard label="Settled in view" value={formatMoney(settledTotal)} sub={`${settledIn.length} cleared payments`} icon={CheckCheck} tone="green" />
        <MetricCard label="Average payment" value={settledIn.length ? formatMoney(Math.round(average)) : "—"} sub="Across the payments shown" icon={Scale} tone="indigo" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments or reference" className="pl-9" />
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All months</SelectItem>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="any">Any status</SelectItem><SelectItem value="settled">Settled</SelectItem><SelectItem value="pending">Pending verification</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No payments recorded yet"
          description="Record a payment from any bill, or log one you made elsewhere."
          action={<Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Log a payment</Button>}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(p.status || "settled") === "settled" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" : (p.status || "settled") === "pending" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                {(p.status || "settled") === "settled" ? <CheckCheck className="h-5 w-5" /> : (p.status || "settled") === "pending" ? <Clock className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.merchant}{p.reference ? ` · ${p.reference}` : ""} · {p.source || "bill"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(p.amount, p.currency)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.paid_date)} · {p.category}{(p.status || "settled") !== "settled" ? ` · ${p.status}` : ""}</p>
                {p.refund_amount > 0 && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(p.refund_amount, p.currency)} refunded{p.refund_date ? ` ${formatDate(p.refund_date)}` : ""}</p>}
              </div>
              {p.kind === "payment" && (p.status || "settled") === "settled" && !(p.refund_amount > 0) && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600" title="Record a refund" onClick={() => refund(p)}><Undo2 className="h-3.5 w-3.5" /></Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log a payment</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Grocery order" /></div>
              <div className="space-y-1.5"><Label>Merchant</Label><Input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Paid on</Label><Input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label>Reference (optional)</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR, order id, cheque no." /></div>
              <div className="col-span-2 space-y-1.5">
                <Label>Receipt (optional)</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  {receiptUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {receipt ? "Receipt attached (stored privately)" : "Attach PDF, JPG or PNG"}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { uploadReceipt(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save payment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}