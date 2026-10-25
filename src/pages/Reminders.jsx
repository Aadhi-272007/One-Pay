import { useEffect, useState } from "react";
import { Plus, Bell, BellRing, AlertCircle, CalendarClock, CheckCheck, AlarmClockOff, Loader2, RefreshCw, Link as LinkIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import BillDialog from "@/components/oney/BillDialog";
import { formatMoney, daysUntil, isOverdue, nextDueDate, formatDate } from "@/lib/money";
import PayConfirmDialog from "@/components/oney/PayConfirmDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function Reminders() {
  const [bills, setBills] = useState([]);
  const [windowDays, setWindowDays] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [paying, setPaying] = useState(null);
  const [sweeping, setSweeping] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        base44.entities.Bill.filter({ status: "active" }, { limit: 100 }),
        base44.entities.AppSetting.filter({}, { limit: 1 }),
      ]);
      const active = (b.items ?? b).map((bill) => {
        const due = nextDueDate(bill.due_date, bill.billing_cycle);
        return { ...bill, _due: due ? due.toISOString().slice(0, 10) : null };
      }).filter((bill) => bill._due);
      setBills(active);
      const setting = (s.items ?? s)[0];
      if (setting) setWindowDays(setting.reminder_window_days ?? 3);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const notSnoozed = bills.filter((b) => !(b.snoozed_until && b.snoozed_until > new Date().toISOString().slice(0, 10)) && b.dismissed_cycle !== b._due);
  const overdue = notSnoozed.filter((b) => isOverdue(b._due));
  const dueToday = notSnoozed.filter((b) => daysUntil(b._due) === 0);
  const thisWeek = notSnoozed.filter((b) => { const d = daysUntil(b._due); return d > 0 && d <= 7; });
  const needsAttention = notSnoozed.filter((b) => { const d = daysUntil(b._due); return d <= windowDays; });
  const outstanding = needsAttention.reduce((s, b) => s + Number(b.amount || 0), 0);

  const snooze = async (bill) => {
    setBusyId(bill.id);
    try {
      const until = new Date(); until.setDate(until.getDate() + 3);
      await base44.entities.Bill.update(bill.id, { snoozed_until: until.toISOString().slice(0, 10) });
      toast({ title: "Snoozed 3 days", description: bill.title });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (bill) => {
    setBusyId(bill.id);
    try {
      await base44.entities.Bill.update(bill.id, { dismissed_cycle: bill._due });
      toast({ title: "Reminder dismissed for this cycle" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    try {
      const res = await base44.functions.invoke('reminderSweep', {});
      const data = res.data;
      if (data.error) toast({ title: "Sweep failed", description: data.error, variant: "destructive" });
      else toast({ title: "Reminder sweep complete", description: `${data.notifications} notification(s), ${data.emails} email(s) sent.` });
      await load();
    } catch (e) {
      toast({ title: "Sweep failed", description: e.message, variant: "destructive" });
    } finally {
      setSweeping(false);
    }
  };

  if (loading) return <Spinner />;

  const group = (title, subtitle, items, tone) => items.length > 0 && (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className={`text-sm font-bold ${tone}`}>{formatMoney(items.reduce((s, b) => s + Number(b.amount || 0), 0))}</span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Bell className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{b.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{b.merchant} · {b.category}{b.autopay ? " · AutoPay" : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(b.amount, b.currency)}</p>
              <p className={`text-xs font-medium ${isOverdue(b._due) ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>{formatDate(b._due)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busyId === b.id} onClick={() => setPaying(b)}>
                <><CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark as paid</>
              </Button>
              <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => snooze(b)}><AlarmClockOff className="mr-1 h-3.5 w-3.5" /> Snooze 3 days</Button>
              <Button size="sm" variant="ghost" className="text-slate-500" disabled={busyId === b.id} onClick={() => dismiss(b)}>Dismiss cycle</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Smart reminders</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Derived from every live due date — {windowDays} day{windowDays === 1 ? "" : "s"} before it lands.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={sweeping} onClick={runSweep}>
            {sweeping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Run sweep now
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add payment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Needs attention" value={String(needsAttention.length)} sub={`${formatMoney(outstanding)} outstanding`} icon={BellRing} tone="orange" />
        <MetricCard label="Overdue" value={String(overdue.length)} sub={overdue.length ? "Settle these first" : "Nothing overdue"} icon={AlertCircle} tone={overdue.length ? "red" : "slate"} />
        <MetricCard label="Due this week" value={String(thisWeek.length)} sub="Today plus your reminder window" icon={CalendarClock} tone="green" />
      </div>

      {needsAttention.length === 0 ? (
        <EmptyState title="You're all caught up" description={`Nothing is due within your ${windowDays}-day window. Adjust it in Settings.`} />
      ) : (
        <>
          {group("Due today", "Settle them before the day ends.", dueToday, "text-slate-900 dark:text-white")}
          {group("Overdue", "These already passed their due date.", overdue, "text-red-500")}
          {group("Coming up this week", "Within the next seven days.", thisWeek, "text-slate-900 dark:text-white")}
          {group("Later in your window", `Due within ${windowDays} days.`, needsAttention.filter((b) => daysUntil(b._due) > 7), "text-slate-900 dark:text-white")}
        </>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400"><LinkIcon className="h-3.5 w-3.5" /> Reminders refresh whenever you open OnePay or run the sweep from here or Settings.</p>

      <BillDialog open={dialogOpen} onOpenChange={setDialogOpen} bill={null} onSaved={load} />
      <PayConfirmDialog record={paying ? { ...paying, due_date: paying._due || paying.due_date } : null} target="bill" onClose={() => setPaying(null)} onDone={load} />
    </div>
  );
}