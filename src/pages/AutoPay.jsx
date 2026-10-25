import { useEffect, useState } from "react";
import { Plus, Zap, CalendarClock, HandCoins, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import BillDialog from "@/components/oney/BillDialog";
import { formatMoney, formatDate, daysUntil } from "@/lib/money";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function AutoPay() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.Bill.filter({ status: "active" }, { sort: "due_date", limit: 100 });
      setBills(page.items ?? page);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const automated = bills.filter((b) => b.autopay);
  const manual = bills.filter((b) => !b.autopay);
  const automatedOutflow = automated.reduce((s, b) => s + Number(b.amount || 0), 0);
  const nextAuto = automated.map((b) => ({ b, d: daysUntil(b.due_date) })).filter((x) => x.d >= 0).sort((a, b) => a.d - b.d)[0];
  const missingDetails = automated.filter((b) => !b.account_details);

  const toggle = async (bill, value) => {
    setBusyId(bill.id);
    try {
      await base44.entities.Bill.update(bill.id, { autopay: value });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner />;

  const row = (b) => (
    <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Zap className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{b.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {b.account_details ? `Debit from ${b.account_details} · ` : "No account details saved · "}
          {formatDate(b.due_date)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(b.amount, b.currency)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{b.billing_cycle}</p>
      </div>
      <Switch checked={b.autopay} disabled={busyId === b.id} onCheckedChange={(v) => toggle(b, v)} />
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AutoPay management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Know exactly what leaves your account on its own — and when.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add payment</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Automated outflow" value={formatMoney(automatedOutflow)} sub={`${automated.length} bill(s) debited automatically`} icon={Zap} tone="indigo" />
        <MetricCard label="Next auto-debit" value={nextAuto ? formatDate(nextAuto.b.due_date) : "—"} sub={nextAuto ? nextAuto.b.title : "Nothing scheduled"} icon={CalendarClock} tone="blue" />
        <MetricCard label="Paid manually" value={String(manual.length)} sub="Bills you settle yourself each month" icon={HandCoins} tone="green" />
      </div>

      {missingDetails.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {missingDetails.length} AutoPay bill{missingDetails.length > 1 ? "s" : ""} {missingDetails.length > 1 ? "have" : "has"} no account details saved. Open {missingDetails.length > 1 ? "them" : "it"} in All payments and add where it is debited from, so you can spot a charge fast.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Debited automatically</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">OnePay still reminds you — you just do not have to make the payment.</p>
        </div>
        {automated.length === 0 ? (
          <div className="p-5"><EmptyState className="border-0 dark:bg-transparent" title="Nothing is automated yet" description="Flip any bill below if the biller set up a mandate." /></div>
        ) : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{automated.map(row)}</ul>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">You pay these yourself</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Switch any of them on if the biller sets up a mandate.</p>
        </div>
        {manual.length === 0 ? (
          <div className="p-5"><EmptyState className="border-0 dark:bg-transparent" title="Every active bill is automated" /></div>
        ) : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{manual.map(row)}</ul>}
      </div>

      <BillDialog open={dialogOpen} onOpenChange={setDialogOpen} bill={null} onSaved={load} />
    </div>
  );
}