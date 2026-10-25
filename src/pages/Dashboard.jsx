import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, ArrowUpRight, AlertCircle, RefreshCw, Plus, ChevronRight,
  MailCheck, Loader2, CreditCard,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MetricCard from "@/components/oney/MetricCard";
import { base44 } from "@/api/base44Client";
import { formatMoney, monthlyEquivalent, isOverdue, daysUntil } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { triggerCalendarSync, triggerGmailSync } from "@/lib/autoSync";

const CATEGORIES = ["Subscriptions", "Utilities", "Cards", "Insurance", "EMI", "Rent", "Other"];
const CYCLES = ["one-time", "weekly", "monthly", "quarterly", "annual"];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [bills, setBills] = useState([]);
  const [subs, setSubs] = useState([]);
  const [history, setHistory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyTarget, setMonthlyTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", merchant: "", amount: "", due_date: "", billing_cycle: "monthly", category: "Subscriptions",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const me = await base44.auth.me().catch(() => null);
        setUser(me);
        const [b, s, h, x, cfg] = await Promise.all([
          base44.entities.Bill.filter({}, { sort: "due_date", limit: 100 }),
          base44.entities.Subscription.filter({}, { limit: 100 }),
          base44.entities.Payment.filter({}, { sort: "-paid_date", limit: 500 }),
          base44.entities.Expense.filter({}, { limit: 500 }),
          base44.entities.AppSetting.filter({}, { limit: 1 }),
        ]);
        setBills(b.items ?? b);
        setSubs(s.items ?? s);
        setHistory(h.items ?? h);
        setExpenses(x.items ?? x);
        const setting = (cfg.items ?? cfg)[0];
        setMonthlyTarget(setting?.monthly_target && Number(setting.monthly_target) > 0 ? Number(setting.monthly_target) : null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    triggerGmailSync();
  }, []);

  const addBill = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.due_date) return;
    setSaving(true);
    try {
      await base44.entities.Bill.create({
        title: form.title,
        merchant: form.merchant || form.title,
        amount: Number(form.amount),
        currency: "INR",
        due_date: form.due_date,
        billing_cycle: form.billing_cycle,
        category: form.category,
        status: "active",
        autopay: false,
      });
      toast({ title: "Payment added", description: form.title });
      setAddOpen(false);
      setForm({ title: "", merchant: "", amount: "", due_date: "", billing_cycle: "monthly", category: "Subscriptions" });
      triggerCalendarSync();
      const b = await base44.entities.Bill.filter({}, { sort: "due_date", limit: 100 });
      setBills(b.items ?? b);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        {error}
      </div>
    );
  }

  const activeBills = bills.filter((b) => b.status !== "paused" && b.status !== "completed");
  const monthlyBills = activeBills.reduce((sum, b) => sum + monthlyEquivalent(b.amount, b.billing_cycle), 0);
  const monthlySubs = subs.filter((s) => s.status === "active")
    .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billing_interval), 0);
  const upcomingBills = activeBills
    .filter((b) => !isOverdue(b.due_date) && daysUntil(b.due_date) <= 30)
    .map((b) => ({ ...b, kind: "Bill" }));
  // Active subscription renewals inside the same 30-day window.
  const upcomingSubs = subs
    .filter((s) => s.status === "active" && s.next_renewal_date && !isOverdue(s.next_renewal_date) && daysUntil(s.next_renewal_date) <= 30)
    .map((s) => ({ id: `sub-${s.id}`, title: s.plan_name, merchant: s.merchant, amount: s.amount, currency: s.currency, category: s.category, due_date: s.next_renewal_date, kind: "Subscription" }));
  const upcoming = [...upcomingBills, ...upcomingSubs].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const overdue = activeBills.filter((b) => isOverdue(b.due_date));
  const activeSubCount = subs.filter((s) => s.status === "active").length;
  // Consolidated spending (settled payments + expenses) for the month metrics and trend.
  const spend = [
    ...history.filter((p) => p.status === "settled").map((p) => ({ date: p.paid_date, amount: Number(p.amount || 0) })),
    ...expenses.map((e) => ({ date: e.date, amount: Number(e.amount || 0) })),
  ];
  const settledThisMonth = spend.filter((p) => (p.date || "").slice(0, 7) === new Date().toISOString().slice(0, 7));
  const settledTotal = settledThisMonth.reduce((s, p) => s + p.amount, 0);
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    trend.push({
      month: d.toLocaleString("en", { month: "short" }),
      amount: spend.filter((p) => (p.date || "").slice(0, 7) === key).reduce((s, p) => s + p.amount, 0),
    });
  }

  const statusBadge = (b) => {
    if (isOverdue(b.due_date)) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">Overdue</span>;
    const d = daysUntil(b.due_date);
    if (d === 0) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">Due today</span>;
    if (d <= 7) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">Due in {d}d</span>;
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{b.due_date}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {user ? `Welcome back, ${user.full_name?.split(" ")[0] || "there"}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything you owe, renew and spend — in one view.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="mr-1 h-4 w-4" /> Add payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
            <form onSubmit={addBill} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Electricity bill" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Merchant</Label>
                  <Input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. BESCOM" />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Billing cycle</Label>
                  <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monthly spending" value={formatMoney(monthlyBills + monthlySubs)} sub="Bills + subscriptions" icon={Wallet} tone="indigo" />
        <MetricCard label="Due in 30 days" value={String(upcoming.length)} sub={`${formatMoney(upcoming.reduce((s, b) => s + b.amount, 0))} scheduled`} icon={CreditCard} tone="blue" />
        <MetricCard label="Overdue" value={String(overdue.length)} sub={overdue.length ? formatMoney(overdue.reduce((s, b) => s + b.amount, 0)) : "Nothing overdue"} icon={AlertCircle} tone={overdue.length ? "red" : "slate"} />
        <MetricCard label="Settled this month" value={formatMoney(settledTotal)} sub={`${settledThisMonth.length} payments cleared`} icon={RefreshCw} tone="green" />
      </div>

      {monthlyTarget && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">Monthly budget</span>
            <span className="text-slate-500 dark:text-slate-400">
              <span className={settledTotal > monthlyTarget ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold text-slate-900 dark:text-slate-100"}>{formatMoney(settledTotal)}</span> of {formatMoney(monthlyTarget)} spent
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${settledTotal > monthlyTarget ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, Math.round((settledTotal / monthlyTarget) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Spending trend</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Settled payments, last six months</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="onepayTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Area type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={2} fill="url(#onepayTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming bills</h2>
              <Link to="/bills" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">View all</Link>
            </div>
            {upcoming.length === 0 && overdue.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Nothing due in the next 30 days.</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {[...overdue, ...upcoming].slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{b.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{b.kind === "Subscription" ? "Renewal · " : ""}{b.merchant} · {b.category}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      {statusBadge(b)}
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatMoney(b.amount, b.currency)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent activity</h2>
              <Link to="/history" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">History</Link>
            </div>
            {history.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet.</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {history.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                        <MailCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.title || p.merchant}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.paid_date}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatMoney(p.amount, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
              <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Gmail bill detection</h2>
            </div>
            <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-300/80">
              Connect Gmail read-only and OnePay finds bills, invoices and renewals in your inbox for you to review.
            </p>
            <Link to="/settings">
              <Button variant="outline" size="sm" className="mt-3 border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300">
                Set up in Settings <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}