import { useEffect, useState } from "react";
import {
  Mail, MailCheck, RefreshCw, Download, Trash2, ShieldCheck, LogOut, Loader2, Check, X,
  Wallet, BellRing, Palette, Globe, AlertTriangle, Inbox, Plus, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { setTheme, getTheme, THEMES } from "@/lib/theme";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { formatMoney, formatDate } from "@/lib/money";
import { CURRENCIES } from "@/components/oney/constants";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [gmailState, setGmailState] = useState(null);
  const [calState, setCalState] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [accountEmpty, setAccountEmpty] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [s, gs, cs, sg, bl] = await Promise.all([
        base44.entities.AppSetting.filter({}, { limit: 1 }),
        base44.entities.IntegrationState.filter({ kind: "gmail" }, { limit: 1 }),
        base44.entities.IntegrationState.filter({ kind: "calendar" }, { limit: 1 }),
        base44.entities.GmailSuggestion.filter({ status: "pending" }, { sort: "-created_date", limit: 20 }),
        base44.entities.Bill.filter({}, { limit: 1 }),
      ]);
      setAccountEmpty((bl.items ?? bl).length === 0);
      const existing = (s.items ?? s)[0] || null;
      setSettings(existing);
      setGmailState((gs.items ?? gs)[0] || null);
      setCalState((cs.items ?? cs)[0] || null);
      setSuggestions(sg.items ?? sg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const saveSetting = async (patch) => {
    if (settings) await base44.entities.AppSetting.update(settings.id, patch);
    else {
      const created = await base44.entities.AppSetting.create({ currency: "INR", reminder_window_days: 3, digest_enabled: false, theme: "light", email_reminders_enabled: false, reminder_offsets: "7,3,1", ...patch });
      setSettings(created);
    }
    setSettings((s) => ({ ...(s || {}), ...patch }));
    toast({ title: "Saved" });
  };

  const syncGmail = async () => {
    setBusy("gmail");
    try {
      const res = await base44.functions.invoke("gmailSync", {});
      const d = res.data;
      if (d.connected === false) {
        toast({ title: "Gmail not connected", description: d.reason === "not_connected" ? "Ask to connect Gmail in the OnePay builder chat — a one-time read-only authorization." : d.error, variant: "destructive" });
      } else {
        toast({ title: "Gmail sync complete", description: d.summary });
      }
      await load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const syncCalendar = async () => {
    setBusy("cal");
    try {
      const res = await base44.functions.invoke("calendarSync", {});
      const d = res.data;
      if (d.connected === false) toast({ title: "Calendar not connected", description: "Ask to connect Google Calendar in the OnePay builder chat.", variant: "destructive" });
      else toast({ title: "Calendar synced", description: d.summary });
      await load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const actSuggestion = async (s, action) => {
    setBusy(s.id);
    try {
      const res = await base44.functions.invoke("confirmSuggestion", { suggestion_id: s.id, action });
      const d = res.data;
      if (d.error) toast({ title: "Could not save", description: d.error, variant: "destructive" });
      else toast({ title: action === "confirm" ? "Added to OnePay" : "Dismissed", description: `${s.merchant} — ${formatMoney(s.amount, s.currency)}` });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const sendDigestNow = async () => {
    setBusy("digest");
    try {
      const res = await base44.functions.invoke("reminderSweep", {});
      const d = res.data;
      if (d.error) toast({ title: "Could not send", description: d.error, variant: "destructive" });
      else toast({ title: "Reminder email sent", description: `${d.emails} digest(s) sent, ${d.notifications} in-app reminder(s).` });
    } catch (e) {
      toast({ title: "Could not send", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const sendTestEmail = async () => {
    setBusy("testEmail");
    try {
      const res = await base44.functions.invoke("reminderSweep", { test: true });
      const d = res.data;
      if (d.sent) toast({ title: "Test email sent", description: `Delivered via ${d.channel === "gmail" ? "your Gmail" : "OnePay mail"} to ${user?.email}.` });
      else toast({ title: "Test email failed", description: d.detail, variant: "destructive" });
    } catch (e) {
      toast({ title: "Test email failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const loadDemo = async () => {
    setBusy("demo");
    try {
      const res = await base44.functions.invoke("seedDemoData", {});
      const d = res.data;
      if (d.error) toast({ title: "Could not load demo data", description: d.error, variant: "destructive" });
      else toast({ title: "Demo data loaded", description: "Bills, subscriptions, payments, expenses and reminders added — explore the dashboard." });
      await load();
    } catch (e) {
      toast({ title: "Could not load demo data", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportAll = async () => {
    setBusy("export");
    try {
      const [b, su, p, e] = await Promise.all([
        base44.entities.Bill.filter({}, { limit: 500 }),
        base44.entities.Subscription.filter({}, { limit: 500 }),
        base44.entities.Payment.filter({}, { limit: 500 }),
        base44.entities.Expense.filter({}, { limit: 500 }),
      ]);
      downloadCsv("onepay-full-export.csv", buildCsv(
        [...(b.items ?? b).map((r) => ({ type: "bill", ...r })), ...(su.items ?? su).map((r) => ({ type: "subscription", ...r })),
         ...(p.items ?? p).map((r) => ({ type: "payment", ...r })), ...(e.items ?? e).map((r) => ({ type: "expense", ...r }))],
        [{ label: "Type", value: "type" }, { label: "Title", value: "title" }, { label: "Merchant", value: "merchant" },
         { label: "Amount", value: "amount" }, { label: "Currency", value: "currency" },
         { label: "Date", value: (r) => r.due_date || r.next_renewal_date || r.paid_date || r.date || "" },
         { label: "Category", value: "category" }, { label: "Status", value: "status" }]
      ));
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    const input = prompt('This permanently erases all your OnePay records, attachments and integration state. Type "DELETE" to confirm.');
    if (input !== "DELETE") return;
    setBusy("delete");
    try {
      const res = await base44.functions.invoke("deleteAccountData", { confirm: "DELETE" });
      const d = res.data;
      if (d.error) toast({ title: "Could not delete", description: d.error, variant: "destructive" });
      else {
        toast({ title: "All data erased" });
        await base44.auth.logout("/");
      }
    } catch (e) {
      toast({ title: "Could not delete", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-300" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Currency, reminders and the budget you track against.</p>
      </div>

      {/* Profile */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => base44.auth.logout("/")}><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
      </div>

      {/* Money and reminders */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Money and reminders</h2></div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={settings?.currency || "INR"} onValueChange={(v) => saveSetting({ currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c === "INR" ? "INR · Indian Rupee" : c}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">Used for new spending and every total you see.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Remind me before each due date (days)</Label>
            <Input type="number" min="0" max="30" defaultValue={settings?.reminder_window_days ?? 3} onBlur={(e) => saveSetting({ reminder_window_days: Math.max(0, Math.min(30, Number(e.target.value) || 3)) })} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Days of warning a new payment starts with.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Monthly spending target (optional)</Label>
            <Input type="number" min="0" defaultValue={settings?.monthly_target ?? ""} onBlur={(e) => saveSetting({ monthly_target: Number(e.target.value) || 0 })} placeholder="45000" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Analytics compares what you settled against this number.</p>
          </div>
          <div className="col-span-1 flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Email me before each due date</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">One digest listing every bill inside your reminder window.</p>
            </div>
            <Switch checked={!!settings?.digest_enabled} onCheckedChange={(v) => saveSetting({ digest_enabled: v })} />
          </div>
          <div className="col-span-1 flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Email me before each renewal</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">An individual reminder per bill and subscription, sent from your connected Gmail.</p>
            </div>
            <Switch checked={!!settings?.email_reminders_enabled} onCheckedChange={(v) => saveSetting({ email_reminders_enabled: v })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reminder email days (comma-separated)</Label>
            <Input defaultValue={settings?.reminder_offsets ?? "7,3,1"} onBlur={(e) => {
              const val = e.target.value.split(",").map((x) => parseInt(x, 10)).filter((n) => n >= 0 && n <= 30);
              if (val.length === 0) { e.target.value = "7,3,1"; saveSetting({ reminder_offsets: "7,3,1" }); return; }
              const clean = [...new Set(val)].sort((a, b) => b - a).join(",");
              e.target.value = clean;
              saveSetting({ reminder_offsets: clean });
            }} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Days before each due date to email you — e.g. 7,3,1.</p>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy === "digest"} onClick={sendDigestNow}>
              {busy === "digest" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <BellRing className="mr-1 h-4 w-4" />} Send my reminder email now
            </Button>
            <Button variant="outline" size="sm" disabled={busy === "testEmail"} onClick={sendTestEmail}>
              {busy === "testEmail" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MailCheck className="mr-1 h-4 w-4" />} Send test email
            </Button>
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Connections</h2></div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                Gmail — read-only bill detection
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gmailState?.connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {gmailState?.connected ? "Connected" : "Not connected"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {gmailState?.last_sync_at ? `Last sync ${formatDate(gmailState.last_sync_at)} · ${gmailState.last_result || ""}` : "OnePay scans your inbox for bills, invoices and renewals — read-only, never sends or deletes."}
              </p>
              {gmailState?.last_error && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertTriangle className="h-3 w-3" /> {gmailState.last_error}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy === "gmail"} onClick={syncGmail}>
                {busy === "gmail" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Sync now
              </Button>
              <Button variant="ghost" size="sm" disabled={busy === "gmailReconnect"} onClick={() => toast({ title: "Reconnect Gmail", description: "Ask in the OnePay builder chat: \u201CReconnect Gmail\u201D — a one-time Google authorization screen opens. Nothing is sent or deleted; reading stays read-only." })}>Reconnect</Button>
              <Button variant="ghost" size="sm" onClick={() => window.open("https://myaccount.google.com/permissions", "_blank")}>Manage in Google</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                Google Calendar — due-date mirroring
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${calState?.connected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {calState?.connected ? "Connected" : "Not connected"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {calState?.last_sync_at ? `Last sync ${formatDate(calState.last_sync_at)} · ${calState.last_result || ""}` : "Mirrors every upcoming due date as an all-day event with a day-before reminder."}
              </p>
              {calState?.last_error && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertTriangle className="h-3 w-3" /> {calState.last_error}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy === "cal"} onClick={syncCalendar}>
                {busy === "cal" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Sync now
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast({ title: "Reconnect Google Calendar", description: "Ask in the OnePay builder chat: \u201CReconnect Google Calendar\u201D — a one-time Google authorization screen opens." })}>Reconnect</Button>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200"><Inbox className="h-4 w-4" /> {suggestions.length} pending suggestion{suggestions.length > 1 ? "s" : ""} from Gmail</p>
              <ul className="mt-2 space-y-2">
                {suggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{s.merchant} · {formatMoney(s.amount, s.currency)}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.subject || s.snippet}</p>
                      <p className="text-[11px] text-slate-400">{s.kind}{s.due_date ? ` · due ${s.due_date}` : ""} · {Math.round(s.confidence * 100)}% confidence</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy === s.id} onClick={() => actSuggestion(s, "confirm")}>
                        {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="mr-1 h-3.5 w-3.5" /> Add</>}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => actSuggestion(s, "dismiss")}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-indigo-700/70 dark:text-indigo-300/70">Nothing is added to OnePay until you review and confirm it.</p>
            </div>
          )}
        </div>
      </div>

      {/* Appearance and locale */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance and locale</h2></div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => { setThemeState(v); setTheme(v); saveSetting({ theme: v }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{THEMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input defaultValue={settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"} onBlur={(e) => saveSetting({ timezone: e.target.value })} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Reminders and due dates follow this zone.</p>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Download className="h-4 w-4 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Your data</h2></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {accountEmpty && (
            <Button disabled={busy === "demo"} onClick={loadDemo}>
              {busy === "demo" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Load demo data
            </Button>
          )}
          <Button variant="outline" disabled={busy === "export"} onClick={exportAll}>
            {busy === "export" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} Export everything (CSV)
          </Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:text-red-400" disabled={busy === "delete"} onClick={deleteAccount}>
            {busy === "delete" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />} Delete account data
          </Button>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-300" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">How OnePay keeps your data</h2></div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your bills, payments and preferences are private to your account. Payments are recorded with date, method and reference you enter,
          so your history stays complete whether the money left by card, mandate or cash. Gmail runs with a read-only permission — OnePay
          reads messages to detect bills and never sends, deletes or modifies your email. Calendar access is a separate permission used only
          to mirror due dates. Every record is isolated per user on the server, and connection tokens are stored only in Base44's secure
          integration storage — never in the app or your browser.
        </p>
      </div>
    </div>
  );
}