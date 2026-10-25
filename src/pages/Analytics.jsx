import { useEffect, useState } from "react";
import { CheckCircle2, Hourglass, AlertCircle, Clock, ChevronLeft, ChevronRight, Target, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { base44 } from "@/api/base44Client";
import { formatMoney } from "@/lib/money";

const COLORS = ["#2563EB", "#4F46E5", "#10B981", "#F97316", "#EF4444", "#8B5CF6", "#06B6D4", "#64748B"];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [subs, setSubs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, x, b, s, su] = await Promise.all([
          base44.entities.Payment.filter({}, { limit: 500 }),
          base44.entities.Expense.filter({}, { limit: 500 }),
          base44.entities.Bill.filter({ status: "active" }, { limit: 100 }),
          base44.entities.AppSetting.filter({}, { limit: 1 }),
          base44.entities.Subscription.filter({}, { limit: 100 }),
        ]);
        setPayments(p.items ?? p);
        setExpenses(x.items ?? x);
        setBills(b.items ?? b);
        setSubs(su.items ?? su);
        setSettings((s.items ?? s)[0] || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner />;

  const { y, m } = cursor;
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 1);
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  // Consolidated spending: settled bill payments plus standalone expenses.
  const spend = [
    ...payments.filter((p) => p.status === "settled").map((p) => ({ date: p.paid_date, amount: Number(p.amount || 0), category: p.category || "Other" })),
    ...expenses.map((e) => ({ date: e.date, amount: Number(e.amount || 0), category: e.category || "Other" })),
  ];
  const settled = spend.filter((p) => (p.date || "").slice(0, 7) === monthKey);
  const settledTotal = settled.reduce((s, p) => s + p.amount, 0);

  const stillDue = bills.filter((b) => (b.due_date || "").slice(0, 7) === monthKey);
  const pastDue = bills.filter((b) => {
    const dd = new Date((b.due_date || "").slice(0, 10) + "T00:00:00");
    return dd < monthEnd && dd < new Date();
  });
  const pastDueTotal = pastDue.reduce((s, b) => s + Number(b.amount || 0), 0);

  const avgBuckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const key = d.toISOString().slice(0, 7);
    const rows = spend.filter((p) => (p.date || "").slice(0, 7) === key);
    const total = rows.reduce((s, p) => s + p.amount, 0);
    avgBuckets.push({ key, label: d.toLocaleString("en", { month: "short" }), total, count: rows.length });
  }
  const sixMonthAvg = avgBuckets.length ? avgBuckets.reduce((s, b) => s + b.total, 0) / avgBuckets.length : 0;

  const byCategory = Object.entries(
    settled.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + p.amount; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const move = (delta) => {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const target = Number(settings?.monthly_target || 0);

  // ---- Smart predictions (all labelled estimates, computed only from real records) ----
  const nextMonthStart = new Date(y, m + 1, 1);
  const nextMonthEnd = new Date(y, m + 2, 1);
  const inRange = (d) => d >= nextMonthStart && d < nextMonthEnd;
  const nextBills = bills.filter((b) => inRange(new Date((b.due_date || "") + "T00:00:00")));
  const nextSubs = subs.filter((s) => s.status === "active" && inRange(new Date((s.next_renewal_date || "") + "T00:00:00")));
  const baseAvg = (() => {
    const last3 = avgBuckets.slice(-3).filter((b) => b.count > 0);
    return last3.length ? last3.reduce((s, b) => s + b.total, 0) / last3.length : 0;
  })();
  const forecast = Math.round(baseAvg + nextBills.reduce((s, b) => s + Number(b.amount || 0), 0) + nextSubs.reduce((s, x) => s + Number(x.amount || 0), 0));
  const unusual = sixMonthAvg > 0 && settledTotal > 1.5 * sixMonthAvg && settled.length >= 3;

  const priceIncreases = (() => {
    const groups = {};
    for (const p of payments.filter((x) => x.status === "settled" && x.merchant)) {
      (groups[p.merchant.toLowerCase()] = groups[p.merchant.toLowerCase()] || []).push(p);
    }
    const found = [];
    for (const list of Object.values(groups)) {
      const sorted = [...list].sort((a, b) => (a.paid_date || "").localeCompare(b.paid_date || ""));
      if (sorted.length < 2) continue;
      const prev = Number(sorted[sorted.length - 2].amount || 0);
      const cur = Number(sorted[sorted.length - 1].amount || 0);
      if (prev > 0 && cur > prev * 1.02) found.push({ merchant: sorted[sorted.length - 1].merchant, prev, cur });
    }
    return found;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly expense analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Where your money went, what is still owed, and how the last six months compare.</p>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 dark:border-slate-700 dark:bg-slate-900">
        <button onClick={() => move(-1)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
        <span className="px-3 text-sm font-semibold text-slate-900 dark:text-white">{monthStart.toLocaleString("en", { month: "long" })} {y}</span>
        <button onClick={() => move(1)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Settled this month" value={formatMoney(settledTotal)} sub={`${settled.length} bills & expenses cleared`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Still due" value={formatMoney(stillDue.reduce((s, b) => s + Number(b.amount || 0), 0))} sub={`${stillDue.length} bill(s) in ${monthStart.toLocaleString("en", { month: "long" })} ${y}`} icon={Hourglass} tone="blue" />
        <MetricCard label="Past due" value={formatMoney(pastDueTotal)} sub={`${pastDue.length} overdue right now`} icon={AlertCircle} tone={pastDue.length ? "red" : "slate"} />
        <MetricCard label="Monthly average" value={formatMoney(Math.round(sixMonthAvg))} sub="Across the last six months" icon={Clock} tone="indigo" />
      </div>

      {target > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              {settledTotal <= target
                ? `Within target — ${formatMoney(target - settledTotal)} left of your ${formatMoney(target)} monthly budget.`
                : `Over target by ${formatMoney(settledTotal - target)} this month.`}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Smart predictions</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">Estimates</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Computed from your recorded payments and renewals — never invented.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Next month forecast</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatMoney(forecast)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {formatMoney(Math.round(baseAvg))} recent average{nextBills.length ? ` + ${nextBills.length} bill(s)` : ""}{nextSubs.length ? ` + ${nextSubs.length} renewal(s)` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unusual spending</p>
            <p className={`mt-1 text-sm font-semibold ${unusual ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
              {unusual ? "Detected this month" : "Nothing unusual"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{unusual ? `You settled ${formatMoney(settledTotal)} — over 1.5× your ${formatMoney(Math.round(sixMonthAvg))} monthly average.` : "This month's settled spend is within your normal range."}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Price increases</p>
            {priceIncreases.length === 0 ? (
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">None detected</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {priceIncreases.slice(0, 3).map((inc, i) => (
                  <li key={i} className="text-[11px] text-red-600 dark:text-red-400">{inc.merchant}: {formatMoney(inc.prev)} → {formatMoney(inc.cur)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Six-month spending trend</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Settled bills & expenses per month</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={avgBuckets} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs><linearGradient id="anTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} /><stop offset="100%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2} fill="url(#anTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Where it went in {monthStart.toLocaleString("en", { month: "long" })} {y}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Settled spend by category</p>
          {byCategory.length === 0 ? (
            <EmptyState className="mt-4 border-0 dark:bg-transparent" title="No payments recorded for this month" description="Category breakdown appears once you settle payments." />
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}