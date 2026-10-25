import { useEffect, useState } from "react";
import { Plus, Users, Loader2, Trash2, HandCoins, CheckCheck, Split } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/oney/MetricCard";
import EmptyState, { Spinner } from "@/components/oney/EmptyState";
import { formatMoney, formatDate } from "@/lib/money";
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
import { CURRENCIES, CATEGORIES } from "@/components/oney/constants";

const EMPTY = { title: "", merchant: "", amount: "", currency: "INR", date: "", category: "Other", notes: "" };

export default function Shared() {
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [participants, setParticipants] = useState([]); // [{email, share, settled:false}]
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.SplitExpense.filter({}, { sort: "-date", limit: 100 });
      setSplits(page.items ?? page);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const splitEvenly = (amount, count) => {
    const per = Math.round(((Number(amount) || 0) / count) * 100) / 100;
    setParticipants((ps) => ps.map((p) => ({ ...p, share: per })));
  };
  const addParticipant = (email) => {
    if (!email.trim()) return;
    setParticipants((ps) => [...ps, { email: email.trim(), share: Math.round(((Number(form.amount) || 0) / (ps.length + 2)) * 100) / 100, settled: false }]);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.date) return;
    if (participants.some((p) => !p.email || !(Number(p.share) > 0))) { toast({ title: "Check participant shares", variant: "destructive" }); return; }
    if (participants.length > 0 && !agreed) { toast({ title: "Consent needed", description: "Confirm each participant agreed before recording their share.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.SplitExpense.create({
        ...form, amount: Number(form.amount),
        participants: participants.map((p) => ({ email: p.email, share: Number(p.share), settled: false })),
      });
      setOpen(false);
      setForm(EMPTY);
      setParticipants([]);
      setAgreed(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const settle = async (s, idx) => {
    setBusyId(`${s.id}:${idx}`);
    try {
      const next = s.participants.map((p, i) => (i === idx ? { ...p, settled: true } : p));
      await base44.entities.SplitExpense.update(s.id, { participants: next });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s) => {
    if (!confirm(`Delete the split for "${s.title}"?`)) return;
    setBusyId(s.id);
    try {
      await base44.entities.SplitExpense.delete(s.id);
      await base44.entities.AuditEvent.create({ action: "split_deleted", entity_type: "split", entity_id: s.id, detail: s.title });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const owed = splits.reduce((sum, s) => sum + (s.participants || []).filter((p) => !p.settled).reduce((x, p) => x + Number(p.share || 0), 0), 0);
  const myShare = splits.reduce((sum, s) => {
    const others = (s.participants || []).reduce((x, p) => x + Number(p.share || 0), 0);
    return sum + Math.max(0, Number(s.amount || 0) - others);
  }, 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shared expenses</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record who owes what for bills you share with family or roommates. Each person's own OnePay data always stays private.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setForm(EMPTY); setParticipants([]); setAgreed(false); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Record a split
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Splits recorded" value={String(splits.length)} sub="Shared bills you track" icon={Split} tone="indigo" />
        <MetricCard label="Owed to you" value={formatMoney(owed)} sub="Unsettled shares from others" icon={HandCoins} tone="orange" />
        <MetricCard label="Your own share" value={formatMoney(myShare)} sub="Across all splits" icon={CheckCheck} tone="green" />
      </div>

      {splits.length === 0 ? (
        <EmptyState
          title="No shared expenses yet"
          description="Track rent, groceries or utility bills you split with family or roommates."
          action={<Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Record a split</Button>}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {splits.map((s) => {
            const others = (s.participants || []);
            const mine = Math.max(0, Number(s.amount || 0) - others.reduce((x, p) => x + Number(p.share || 0), 0));
            return (
              <li key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Users className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.merchant || "—"} · {formatDate(s.date)} · {s.category} · your share {formatMoney(mine, s.currency)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(s.amount, s.currency)}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" disabled={busyId === s.id} onClick={() => remove(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {others.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 pl-[52px]">
                    {others.map((p, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${p.settled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {p.email} · {formatMoney(p.share, s.currency)}
                        {!p.settled && (
                          <button className="rounded-full p-0.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-500/20" title="Mark settled" disabled={busyId === `${s.id}:${idx}`} onClick={() => settle(s, idx)}>
                            {busyId === `${s.id}:${idx}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                          </button>
                        )}
                        {p.settled && <CheckCheck className="h-3 w-3" />}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Record a shared expense</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. October electricity bill" /></div>
              <div className="space-y-1.5"><Label>Total amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Other participants</Label>
                <button type="button" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300" onClick={() => splitEvenly(form.amount, participants.length + 1)} disabled={participants.length === 0}>
                  Split evenly
                </button>
              </div>
              {participants.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={p.email} onChange={(e) => setParticipants((ps) => ps.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x)))} placeholder="name@email.com" />
                  <Input type="number" min="0" step="0.01" value={p.share} onChange={(e) => setParticipants((ps) => ps.map((x, i) => (i === idx ? { ...x, share: e.target.value } : x)))} className="w-28" />
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-500" onClick={() => setParticipants((ps) => ps.filter((_, i) => i !== idx))}>×</Button>
                </div>
              ))}
              <button type="button" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-300" onClick={() => addParticipant("")}>+ Add participant</button>
            </div>

            {participants.length > 0 && (
              <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                I confirm each participant agreed to share this expense. Their OnePay data stays private — this only records what they owe me.
              </label>
            )}

            <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save split"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}