import { useEffect, useState } from "react";
import { Plus, Layers, Download, Wallet, CalendarCheck, Loader2, Trash2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { formatMoney } from "@/lib/money";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES, CATEGORIES, CYCLES } from "@/components/oney/constants";

const EMPTY = { name: "", merchant: "", amount: "", currency: "INR", day_of_month: "1", billing_cycle: "monthly", payment_method: "", category: "Subscriptions" };

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [t, b, p] = await Promise.all([
        base44.entities.Template.filter({}, { sort: "day_of_month", limit: 100 }),
        base44.entities.Bill.filter({ status: "active" }, { limit: 100 }),
        base44.entities.Payment.filter({}, { limit: 200 }),
      ]);
      setTemplates(t.items ?? t);
      setBills(b.items ?? b);
      setPayments(p.items ?? p);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const month = new Date().toISOString().slice(0, 7);
  const monthlyValue = templates.filter((t) => t.billing_cycle === "monthly").reduce((s, t) => s + Number(t.amount || 0), 0);
  const loggedCount = templates.filter((t) => t.last_logged_month === month).length;

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setSaving(true);
    try {
      await base44.entities.Template.create({ ...form, amount: Number(form.amount), day_of_month: Number(form.day_of_month || 1) });
      toast({ title: "Template saved", description: form.name });
      setOpen(false);
      setForm(EMPTY);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveFromBills = async () => {
    const withTemplates = new Set(templates.map((t) => t.bill_id).filter(Boolean));
    const candidates = bills.filter((b) => !withTemplates.has(b.id) && ["weekly", "monthly", "quarterly", "annual"].includes(b.billing_cycle));
    if (candidates.length === 0) {
      toast({ title: "Nothing to save", description: "Every active recurring payment already has a template." });
      return;
    }
    setBusyId("bulk");
    try {
      await base44.entities.Template.bulkCreate(candidates.map((b) => ({
        name: b.title,
        merchant: b.merchant || b.title,
        amount: Number(b.amount),
        currency: b.currency || "INR",
        day_of_month: Number((b.due_date || "").slice(8, 10) || 1),
        billing_cycle: b.billing_cycle,
        payment_method: b.payment_method || "",
        category: b.category || "Other",
        bill_id: b.id,
      })));
      toast({ title: `${candidates.length} template(s) saved` });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const logMonth = async (t) => {
    setBusyId(t.id);
    try {
      const today = new Date();
      const payDate = new Date(today.getFullYear(), today.getMonth(), Math.min(t.day_of_month || today.getDate(), today.getDate()));
      await base44.entities.Payment.create({
        title: t.name, merchant: t.merchant, amount: Number(t.amount), currency: t.currency || "INR",
        paid_date: payDate.toISOString().slice(0, 10), category: t.category || "Other", status: "settled",
        source: "template", reference: `Template · ${t.payment_method || "manual"}`,
      });
      await base44.entities.Template.update(t.id, { last_logged_month: month });
      await base44.entities.AuditEvent.create({ action: "template_logged", entity_type: "template", entity_id: t.id, detail: `${t.name} — ${month}` });
      toast({ title: "Instalment logged", description: `${t.name} · ${t.currency} ${t.amount}` });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const deleteTemplate = async (t) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    setBusyId(t.id);
    try {
      await base44.entities.Template.delete(t.id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    downloadCsv("onepay-templates.csv", buildCsv(templates, [
      { label: "Name", value: "name" }, { label: "Merchant", value: "merchant" },
      { label: "Amount", value: "amount" }, { label: "Currency", value: "currency" },
      { label: "Day", value: "day_of_month" }, { label: "Cycle", value: "billing_cycle" },
      { label: "Payment method", value: "payment_method" }, { label: "Category", value: "category" },
    ]));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill templates</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save your recurring payments once, then log this month's instalment in a single click.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:text-orange-400" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> New template</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Templates saved" value={String(templates.length)} sub="Reusable recurring payments" icon={Layers} tone="indigo" />
        <MetricCard label="Monthly value" value={formatMoney(monthlyValue)} sub="Across monthly templates" icon={Wallet} tone="green" />
        <MetricCard label={`Logged in ${new Date().toLocaleString("en", { month: "long" })}`} value={`${loggedCount}/${templates.length}`} sub="One click each month" icon={CalendarCheck} tone="blue" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Turn your payments into templates</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Saves one template for each active payment that does not have one yet.</p>
        </div>
        <Button variant="outline" disabled={busyId === "bulk"} onClick={saveFromBills}>
          {busyId === "bulk" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
          Save my payments as templates
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Save the bills that come back every month — the amount, the day it lands and how you pay — then log them in one click."
          action={<Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> New template</Button>}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Layers className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.merchant} · every {t.billing_cycle?.replace("ly", "ly")} · day {t.day_of_month}{t.payment_method ? ` · ${t.payment_method}` : ""}</p>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(t.amount, t.currency)}</span>
              {t.last_logged_month === month ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /> Logged</span>
              ) : (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busyId === t.id} onClick={() => logMonth(t)}>
                  {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log this month"}
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteTemplate(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
          <form onSubmit={createTemplate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Rent" /></div>
              <div className="space-y-1.5"><Label>Merchant</Label><Input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CYCLES.filter((c) => c !== "one-time").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Day it lands</Label><Input type="number" min="1" max="31" value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label>How it's paid</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="e.g. UPI · HDFC card" /></div>
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}