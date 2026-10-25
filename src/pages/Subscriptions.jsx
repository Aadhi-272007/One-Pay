import { useEffect, useState } from "react";
import { Plus, RefreshCw, CalendarClock, TrendingDown, Wallet, Loader2, Pause, Play, XCircle, Pencil, Banknote, Repeat, Upload, ExternalLink, CreditCard, Lightbulb, Hourglass, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { formatMoney, monthlyEquivalent, annualEquivalent, daysUntil, isOverdue, formatDate } from "@/lib/money";
import PayConfirmDialog from "@/components/oney/PayConfirmDialog";
import UpiPayDialog from "@/components/oney/UpiPayDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES, CATEGORIES, SUB_INTERVALS } from "@/components/oney/constants";
import CalendarChip from "@/components/oney/CalendarChip";
import BillImportDialog from "@/components/oney/BillImportDialog";
import SmartRedirectDialog from "@/components/oney/SmartRedirectDialog";
import { triggerCalendarSync } from "@/lib/autoSync";

const EMPTY = { plan_name: "", merchant: "", amount: "", currency: "INR", billing_interval: "monthly", next_renewal_date: "", trial_end_date: "", category: "Subscriptions", status: "active", autopay: false, upi_id: "", notes: "" };

const STATUS_TONE = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  expired: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
};

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [redirect, setRedirect] = useState(null);
  const [payingSub, setPayingSub] = useState(null);
  const [payingUpi, setPayingUpi] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        base44.entities.Subscription.filter({}, { sort: "next_renewal_date", limit: 100 }),
        base44.entities.Payment.filter({}, { limit: 300 }),
      ]);
      setSubs(s.items ?? s);
      setPayments(p.items ?? p);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    const okType = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (!okType || file.size > 8 * 1024 * 1024) {
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
      if (!d.plan_name && !d.amount) {
        toast({ title: "Nothing recognizable", description: "The AI could not find bill details in this file — try a clearer photo or enter it manually.", variant: "destructive" });
        return;
      }
      setImportData(d);
      setImportOpen(true);
    } catch (e) {
      toast({ title: "Could not read the bill", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const active = subs.filter((s) => s.status === "active");
  const monthlyCost = active.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billing_interval), 0);
  const annualCost = active.reduce((sum, s) => sum + annualEquivalent(s.amount, s.billing_interval), 0);
  const sorted = [...active].sort((a, b) => new Date(a.next_renewal_date) - new Date(b.next_renewal_date));
  const nextRenewal = sorted[0];
  const year = new Date().getFullYear();
  const paidThisYear = payments.filter((p) => (p.status || "settled") === "settled" && (p.source === "gmail" || p.reference === "Subscription") && (p.paid_date || "").startsWith(String(year)))
    .concat(payments.filter((p) => (p.status || "settled") === "settled" && (p.category === "Subscriptions") && (p.paid_date || "").startsWith(String(year))));
  const paidThisYearTotal = [...new Map(paidThisYear.map((p) => [p.id, p])).values()].reduce((s, p) => s + Number(p.amount || 0), 0);

  // ---- Subscription intelligence (from your real records only; forecasts labelled estimates) ----
  const trialSoon = active.filter((s) => s.trial_end_date && daysUntil(s.trial_end_date) >= 0 && daysUntil(s.trial_end_date) <= 7);
  const priceIncreases = (() => {
    const groups = {};
    for (const p of payments.filter((x) => (x.status || "settled") === "settled" && (x.merchant || x.title))) {
      const k = (p.merchant || p.title || "").toLowerCase();
      if (!k) continue;
      (groups[k] = groups[k] || []).push(p);
    }
    const found = [];
    for (const list of Object.values(groups)) {
      const sorted = [...list].sort((a, b) => (a.paid_date || "").localeCompare(b.paid_date || ""));
      if (sorted.length < 2) continue;
      const prev = Number(sorted[sorted.length - 2].amount || 0);
      const cur = Number(sorted[sorted.length - 1].amount || 0);
      if (prev > 0 && cur > prev * 1.02) found.push({ merchant: sorted[sorted.length - 1].merchant || sorted[sorted.length - 1].title, prev, cur });
    }
    return found;
  })();

  const save = async (e) => {
    e.preventDefault();
    if (!form.plan_name || !form.amount || !form.next_renewal_date) return;
    setSaving(true);
    try {
      if (!editing) {
        const dup = subs.find((s) =>
          (s.merchant || "").toLowerCase().trim() === (form.merchant || "").toLowerCase().trim() &&
          (s.plan_name || "").toLowerCase().trim() === (form.plan_name || "").toLowerCase().trim());
        if (dup && !confirm(`"${dup.plan_name}" from ${dup.merchant} is already tracked. Add it anyway?`)) { setSaving(false); return; }
      }
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await base44.entities.Subscription.update(editing.id, payload);
      else await base44.entities.Subscription.create(payload);
      triggerCalendarSync();
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (s, status) => {
    setBusyId(s.id);
    try {
      await base44.entities.Subscription.update(s.id, { status });
      await base44.entities.AuditEvent.create({ action: `subscription_${status}`, entity_type: "subscription", entity_id: s.id, detail: s.plan_name });
      triggerCalendarSync();
      toast({ title: status === "paused" ? "Paused" : status === "cancelled" ? "Marked cancelled" : "Resumed", description: `${s.plan_name} — tracked in OnePay only; the merchant side, if any, is managed with them.` });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription tracker</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything that renews on you, and what it really costs a year.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            {extracting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} Upload bill / invoice
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { e.target.value = ""; handleUpload(e.target.files?.[0]); }} />
          </label>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add subscription</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monthly cost" value={formatMoney(monthlyCost)} sub={`${active.length} active subscriptions`} icon={RefreshCw} tone="blue" />
        <MetricCard label="Annual cost" value={formatMoney(annualCost)} sub="What renews over 12 months" icon={TrendingDown} tone="orange" />
        <MetricCard label="Next renewal" value={nextRenewal ? formatDate(nextRenewal.next_renewal_date) : "—"} sub={nextRenewal ? `${nextRenewal.plan_name} · ${isOverdue(nextRenewal.next_renewal_date) ? "overdue" : `in ${daysUntil(nextRenewal.next_renewal_date)}d`}` : "Nothing active"} icon={CalendarClock} tone="indigo" />
        <MetricCard label={`Paid in ${year}`} value={formatMoney(paidThisYearTotal)} sub={`${paidThisYear.length} subscription payments`} icon={Wallet} tone="green" />
      </div>

      {(trialSoon.length > 0 || priceIncreases.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">Subscription intelligence</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Estimates</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-900/90 dark:text-amber-100/90">
            {trialSoon.map((s) => (
              <li key={`t-${s.id}`} className="flex items-start gap-2">
                <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Free trial for <strong>{s.plan_name}</strong> ({s.merchant}) ends {formatDate(s.trial_end_date)} — {daysUntil(s.trial_end_date) === 0 ? "today" : `in ${daysUntil(s.trial_end_date)} day(s)`}. Cancel with {s.merchant} directly to avoid being charged.</span>
              </li>
            ))}
            {priceIncreases.slice(0, 3).map((inc, i) => (
              <li key={`p-${i}`} className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span><strong>{inc.merchant}</strong> payments went {formatMoney(inc.prev)} → {formatMoney(inc.cur)} — a price increase of {formatMoney(inc.cur - inc.prev)} per cycle (estimate from your payment history).</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextRenewal && (
        <div className="rounded-xl bg-gradient-to-r from-[#1E2B63] to-[#151C45] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase">Next renewal</p>
              <p className="mt-1.5 flex items-center gap-2 text-lg font-bold">{nextRenewal.plan_name}</p>
              <p className="text-sm text-blue-100/80">{nextRenewal.merchant} · {formatDate(nextRenewal.next_renewal_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatMoney(nextRenewal.amount, nextRenewal.currency)}</p>
              <p className="text-xs text-blue-200">{nextRenewal.autopay ? "Debited automatically" : "Manual renewal"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Active subscriptions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sorted by the next renewal — pause or cancel any of them from its details.</p>
        </div>
        {subs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              className="border-0 dark:bg-transparent"
              title="No subscriptions tracked yet"
              description="Track streaming, cloud storage, software, memberships and any service that renews."
              action={<Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add subscription</Button>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...sorted, ...subs.filter((s) => s.status !== "active")].map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Repeat className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{s.plan_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_TONE[s.status] || STATUS_TONE.cancelled}`}>{s.status}</span>
                    {s.autopay && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">AutoPay</span>}
                    <CalendarChip status={s.calendar_status || "none"} error={s.calendar_error} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.merchant} · every {s.billing_interval} · {formatMoney(s.amount, s.currency)}/mo equivalent</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(s.amount, s.currency)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(s.next_renewal_date)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" title={`Open the ${s.merchant} app or its official site`} onClick={() => setRedirect({ sub: s, mode: "app" })}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Open App</Button>
                  <Button size="sm" variant="outline" title="Open your UPI app on its AutoPay mandate screen" onClick={() => setRedirect({ sub: s, mode: "autopay" })}><CreditCard className="mr-1 h-3.5 w-3.5" /> Manage AutoPay</Button>
                </div>
                {s.status === "active" && (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busyId === s.id} onClick={() => setPayingUpi(s)}><Banknote className="mr-1 h-3.5 w-3.5" /> Pay Now</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Pause" disabled={busyId === s.id} onClick={() => setStatus(s, "paused")}><Pause className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
                {s.status === "paused" && (
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => setStatus(s, "active")}><Play className="mr-1 h-3.5 w-3.5" /> Resume</Button>
                )}
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => { setEditing(s); setForm({ ...EMPTY, ...s }); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  {s.status !== "cancelled" && s.status === "active" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" title="Mark cancelled" disabled={busyId === s.id} onClick={() => setStatus(s, "cancelled")}><XCircle className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit subscription" : "Add subscription"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Plan name</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} required placeholder="e.g. Netflix Premium" /></div>
              <div className="space-y-1.5"><Label>Merchant</Label><Input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Merchant UPI ID (for Pay Now)</Label><Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="e.g. netflix@hdfcbank" /></div>
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing interval</Label>
                <Select value={form.billing_interval} onValueChange={(v) => setForm({ ...form, billing_interval: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUB_INTERVALS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Next renewal</Label><Input type="date" value={form.next_renewal_date} onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Trial ends (optional)</Label><Input type="date" value={form.trial_end_date} onChange={(e) => setForm({ ...form, trial_end_date: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-renews with merchant</p>
                <Switch checked={form.autopay} onCheckedChange={(v) => setForm({ ...form, autopay: v })} />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save subscription"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <BillImportDialog open={importOpen} onOpenChange={setImportOpen} initial={importData} existingSubs={subs} onSaved={load} />
      <SmartRedirectDialog open={!!redirect} mode={redirect?.mode} sub={redirect?.sub} onOpenChange={(o) => { if (!o) setRedirect(null); }} />
      <PayConfirmDialog
        record={payingSub ? { id: payingSub.id, title: payingSub.plan_name, merchant: payingSub.merchant, amount: payingSub.amount, currency: payingSub.currency, category: payingSub.category, billing_cycle: payingSub.billing_interval, due_date: payingSub.next_renewal_date, payment_method: "" } : null}
        target="subscription"
        onClose={() => setPayingSub(null)}
        onDone={load}
      />
      <UpiPayDialog
        record={payingUpi ? { id: payingUpi.id, title: payingUpi.plan_name, merchant: payingUpi.merchant, amount: payingUpi.amount, currency: payingUpi.currency, category: payingUpi.category, billing_cycle: payingUpi.billing_interval, due_date: payingUpi.next_renewal_date, upi_id: payingUpi.upi_id } : null}
        target="subscription"
        onClose={() => setPayingUpi(null)}
        onDone={load}
      />
    </div>
  );
}