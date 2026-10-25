import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Search, Zap, Pencil, Trash2, Banknote, CircleDollarSign, CalendarClock, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import BillDialog from "@/components/oney/BillDialog";
import BillScanUpload from "@/components/oney/BillScanUpload";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { CATEGORIES } from "@/components/oney/constants";
import { formatMoney, monthlyEquivalent, isOverdue, daysUntil, formatDate } from "@/lib/money";
import { triggerCalendarSync } from "@/lib/autoSync";
import CalendarChip from "@/components/oney/CalendarChip";
import ProviderPayDialog from "@/components/oney/ProviderPayDialog";
import PayConfirmDialog from "@/components/oney/PayConfirmDialog";
import UpiPayDialog from "@/components/oney/UpiPayDialog";
import ProviderIcon from "@/components/oney/ProviderIcon";
import { matchProvider } from "@/lib/providers";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("Active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [upiBill, setUpiBill] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [providerBill, setProviderBill] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.Bill.filter({}, { sort: "due_date", limit: 100 });
      setBills(page.items ?? page);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const deleteBill = async (bill) => {
    if (!confirm(`Delete "${bill.title}"? This cannot be undone.`)) return;
    setBusyId(bill.id);
    try {
      await base44.entities.Bill.delete(bill.id);
      await base44.entities.AuditEvent.create({ action: "bill_deleted", entity_type: "bill", entity_id: bill.id, detail: bill.title });
      triggerCalendarSync();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = bills.filter((b) => {
    if (status === "Active" && b.status !== "active") return false;
    if (status === "Paused" && b.status !== "paused") return false;
    if (status === "Completed" && b.status !== "completed") return false;
    if (category !== "all" && b.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${b.title} ${b.merchant} ${b.reference || ""} ${b.notes || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const active = bills.filter((b) => b.status === "active");
  const monthly = active.reduce((s, b) => s + monthlyEquivalent(b.amount, b.billing_cycle), 0);
  const dueIn30 = active.filter((b) => !isOverdue(b.due_date) && daysUntil(b.due_date) <= 30);
  const overdueCount = active.filter((b) => isOverdue(b.due_date)).length;

  const badge = (b) => {
    if (isOverdue(b.due_date)) return "Overdue";
    const d = daysUntil(b.due_date);
    if (d === 0) return "Due today";
    if (d <= 7) return `Due in ${d}d`;
    return formatDate(b.due_date);
  };
  const badgeTone = (b) => {
    if (isOverdue(b.due_date)) return "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300";
    const d = daysUntil(b.due_date);
    if (d <= 7) return "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300";
    return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300";
  };

  const exportCsv = () => {
    downloadCsv("onepay-bills.csv", buildCsv(filtered, [
      { label: "Title", value: "title" }, { label: "Merchant", value: "merchant" },
      { label: "Amount", value: "amount" }, { label: "Currency", value: "currency" },
      { label: "Due date", value: "due_date" }, { label: "Cycle", value: "billing_cycle" },
      { label: "Category", value: "category" }, { label: "Status", value: "status" },
      { label: "AutoPay", value: (b) => (b.autopay ? "yes" : "no") },
      { label: "Payment method", value: "payment_method" }, { label: "Notes", value: "notes" },
    ]));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All payments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Subscriptions, utilities, cards, insurance and EMIs in one list.</p>
        </div>
        <div className="flex gap-2">
          <BillScanUpload onSaved={load} />
          <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:text-orange-400" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Tracked payments" value={String(bills.length)} sub={`${active.length} in total`} icon={FileText} tone="indigo" />
        <MetricCard label="Monthly commitment" value={formatMoney(monthly)} sub="Across active bills" icon={CircleDollarSign} tone="green" />
        <MetricCard label="Due in 30 days" value={formatMoney(dueIn30.reduce((s, b) => s + b.amount, 0))} sub={overdueCount ? `${overdueCount} overdue now` : `${dueIn30.length} upcoming`} icon={CalendarClock} tone={overdueCount ? "red" : "blue"} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, provider or reference" className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {["Active", "Paused", "Completed", "All"].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 text-sm ${status === s ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={bills.length === 0 ? "No payments yet" : "Nothing matches your filters"}
          description={bills.length === 0 ? "Add your first bill, EMI or subscription to start tracking what leaves your account." : "Try clearing the search or switching the category."}
          action={bills.length === 0 ? (
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Add payment
            </Button>
          ) : null}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filtered.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{b.title}</p>
                  {b.autopay && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Zap className="h-3 w-3" /> AutoPay</span>}
                  <CalendarChip status={b.calendar_status || "none"} error={b.calendar_error} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{b.merchant || "—"} · {b.category} · {b.billing_cycle}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(b)}`}>{badge(b)}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(b.amount, b.currency)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" title="Open the official provider payment page" onClick={() => setProviderBill(b)}>
                  <ProviderIcon url={matchProvider(b)?.provider?.url} size={24} className="mr-1.5" /> Official Site
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busyId === b.id} onClick={() => setUpiBill(b)}>
                  <Banknote className="mr-1 h-3.5 w-3.5" /> Pay Now
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPaying(b)}>Record</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(b); setDialogOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteBill(b)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BillDialog open={dialogOpen} onOpenChange={setDialogOpen} bill={editing} onSaved={load} />
      <ProviderPayDialog open={!!providerBill} bill={providerBill} onOpenChange={(o) => { if (!o) setProviderBill(null); }} />

      <PayConfirmDialog record={paying} target="bill" onClose={() => setPaying(null)} onDone={load} />
      <UpiPayDialog record={upiBill} target="bill" onClose={() => setUpiBill(null)} onDone={load} />
    </div>
  );
}