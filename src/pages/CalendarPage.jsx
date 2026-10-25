import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Banknote, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatMoney, formatDate, isOverdue } from "@/lib/money";
import PayConfirmDialog from "@/components/oney/PayConfirmDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [entries, setEntries] = useState([]); // [{date, title, amount, currency, billId, merchant}]
  const [selected, setSelected] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calState, setCalState] = useState(null);
  const [payBill, setPayBill] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        base44.entities.Bill.filter({ status: "active" }, { limit: 100 }),
        base44.entities.IntegrationState.filter({ kind: "calendar" }, { limit: 1 }),
      ]);
      const items = [];
      for (const bill of (b.items ?? b)) {
        if (!bill.due_date) continue;
        const amount = Number(bill.amount || 0);
        const currency = bill.currency || "INR";
        items.push({ date: bill.due_date.slice(0, 10), title: bill.title, amount, currency, billId: bill.id, merchant: bill.merchant });
        if (bill.status === "active" && bill.billing_cycle !== "one-time" && bill.last_paid_date) {
          const next = new Date(bill.due_date + "T12:00:00");
          const n = bill.billing_cycle === "weekly" ? 7 : bill.billing_cycle === "monthly" ? 1 : bill.billing_cycle === "quarterly" ? 3 : 12;
          if (bill.billing_cycle === "weekly") next.setDate(next.getDate() + 7); else next.setMonth(next.getMonth() + n);
          items.push({ date: next.toISOString().slice(0, 10), title: bill.title, amount, currency, billId: bill.id, merchant: bill.merchant });
        }
      }
      setEntries(items);
      setCalState((s.items ?? s)[0] || null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: d, entries: entries.filter((e) => e.date === date) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, entries]);

  const selectedEntries = entries.filter((e) => e.date === selected);

  const move = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('calendarSync', {});
      const data = res.data;
      if (data.connected === false) {
        toast({ title: "Google Calendar not connected", description: "Authorize the Calendar connection to mirror due dates.", variant: "destructive" });
      } else {
        toast({ title: "Calendar synced", description: `${data.added} added · ${data.updated} updated · ${data.removed} removed` });
      }
      await load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const recordPayment = async (entry) => {
    try {
      const bill = await base44.entities.Bill.get(entry.billId);
      if (!bill) {
        toast({ title: "Bill not found", description: "This entry's bill may have been deleted.", variant: "destructive" });
        return;
      }
      setPayBill(bill);
    } catch (e) {
      toast({ title: "Could not open the bill", description: e.message, variant: "destructive" });
    }
  };

  const dotFor = (list) => {
    if (list.some((e) => isOverdue(e.date))) return "bg-red-500";
    if (list.length > 0) return "bg-blue-500";
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See every due date at a glance — due, overdue and settled days.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => move(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {new Date(cursor.y, cursor.m, 1).toLocaleString("en", { month: "long" })} {cursor.y}
            </p>
            <button onClick={() => move(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <p key={d} className="pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{d}</p>
            ))}
            {grid.map((cell, i) => cell === null ? (
              <div key={`e${i}`} className="min-h-16 rounded-lg bg-slate-50/50 dark:bg-slate-800/30" />
            ) : (
              <button
                key={cell.date}
                onClick={() => setSelected(cell.date)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors",
                  cell.date === selected
                    ? "border-blue-500 bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : "border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                <span>{cell.day}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", dotFor(cell.entries) || "opacity-0")} />
                {cell.entries.length > 0 && <span className="text-[10px] text-slate-400">{cell.entries.length}</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Due</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Overdue</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Settled</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEntries.length} entr{selectedEntries.length === 1 ? "y" : "ies"}</p>
          <div className="mt-4 space-y-3">
            {selectedEntries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400 dark:border-slate-700">Nothing on this day.</p>
            ) : selectedEntries.map((e, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{e.merchant || "Other"}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(e.amount, e.currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", isOverdue(e.date) ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300" : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300")}>
                    {isOverdue(e.date) ? "OVERDUE" : "DUE"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => recordPayment(e)}>
                    Record payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Google Calendar</h2>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Every upcoming due date is mirrored as an all-day event, with a reminder the day before.
                {calState?.last_result && <span className="ml-1 text-slate-400">({calState.last_result})</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={syncing} onClick={syncNow}>
              {syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Sync now
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("https://calendar.google.com", "_blank")}>
              <ExternalLink className="mr-1 h-4 w-4" /> Open
            </Button>
          </div>
        </div>
        {calState?.last_sync_at && <p className="mt-2 text-xs text-slate-400">Last synced {formatDate(calState.last_sync_at)}</p>}
      </div>

      <PayConfirmDialog record={payBill} target="bill" onClose={() => setPayBill(null)} onDone={load} />
    </div>
  );
}