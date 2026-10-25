import { useEffect, useState } from "react";
import { Globe, CheckCircle2, AlertTriangle, ListChecks, ShieldCheck, ChevronRight, ChevronLeft, SearchX } from "lucide-react";
import ProviderIcon from "@/components/oney/ProviderIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BILL_TYPES, PAY_STEPS, VERIFIED_AS_OF, matchProvider,
  statesFor, providersFor, billTypeLabel, buildBbpsSteps,
} from "@/lib/providers";
import { buildAppTargets } from "@/lib/smartRedirect";

// Resolves a bill to its exact provider, then opens the official payment page.
// If the provider can't be identified, it walks the user through
// bill type → state → provider selection. No guessed or random URLs, ever.
export default function ProviderPayDialog({ open, bill, onOpenChange }) {
  const initial = matchProvider(bill);
  const [type, setType] = useState(initial.type);
  const [state, setState] = useState(null);
  const [unlisted, setUnlisted] = useState(false);
  const [subTargets, setSubTargets] = useState(null);
  const [phase, setPhase] = useState(initial.provider ? "resolved" : "selectType");

  useEffect(() => {
    if (!open || !bill) return;
    const m = matchProvider(bill);
    setType(m.type);
    setState(null);
    setUnlisted(false);
    setSubTargets(null);
    if (m.provider) { setPhase("resolved"); return; }
    if (m.type === "other" || (bill.category || "").toLowerCase().includes("subscription")) {
      setSubTargets(buildAppTargets(bill));
      setPhase("subscription");
      return;
    }
    setPhase(m.type ? (needsState(m.type) ? "selectState" : "selectProvider") : "selectType");
  }, [open, bill]);

  const close = () => onOpenChange(false);
  const openUrl = (url) => url && window.open(url, "_blank", "noopener");

  const pickType = (t) => {
    setType(t);
    setState(null);
    setUnlisted(false);
    setPhase(needsState(t) ? "selectState" : "selectProvider");
  };
  const needsState = (t) => BILL_TYPES.find((b) => b.id === t)?.needsState || false;

  const bbpsLabel = BILL_TYPES.find((t) => t.id === type)?.bbps || null;
  const bbpsSteps = buildBbpsSteps(bbpsLabel);
  const provider = phase === "resolved" ? initial.provider : null;

  const goBack = () => {
    if (phase === "selectProvider") setPhase(needsState(type) ? "selectState" : "selectType");
    else if (phase === "selectState") setPhase("selectType");
  };

  const typeOptions = BILL_TYPES.filter((t) => t.id !== "other");
  const states = type ? statesFor(type) : [];
  const providerList = type ? providersFor(type, state) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open the official payment page</DialogTitle>
          <DialogDescription>
            {bill ? `${bill.title} · ${bill.merchant || bill.category}` : ""}
          </DialogDescription>
        </DialogHeader>

        {provider && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> {provider.name}
                <span className="ml-auto text-[10px] font-medium text-emerald-700/70 dark:text-emerald-200/70">Verified {VERIFIED_AS_OF}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">{provider.note}</p>
            </div>
            <Button className="w-full" onClick={() => openUrl(provider.url)}>
              <ProviderIcon url={provider.url} size={24} className="mr-1.5" /> Open {new URL(provider.url).hostname}
            </Button>
            <StepList steps={PAY_STEPS[provider.billType] || PAY_STEPS.other} title={`How to pay on ${provider.name}`} />
            {bbpsSteps && <StepList steps={bbpsSteps} title="Can't reach the site? Pay via BBPS in PhonePe / Google Pay" tone="muted" />}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If the page doesn't load or has moved, use the BBPS steps above or the payment link printed on your bill. OnePay only opens the page — it never completes or confirms the payment for you.
            </p>
          </div>
        )}

        {phase === "subscription" && subTargets && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> {subTargets.name}
                <span className="ml-auto text-[10px] font-medium text-emerald-700/70 dark:text-emerald-200/70">Verified {VERIFIED_AS_OF}</span>
              </p>
            </div>
            <Button className="w-full" onClick={() => openUrl(subTargets.webUrl)}>
              <ProviderIcon url={subTargets.webUrl} size={24} className="mr-1.5" /> Open {subTargets.name} official site
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For the installed app and its AutoPay mandate, use "Open App" and "Manage AutoPay" on the Subscriptions page.
            </p>
          </div>
        )}

        {phase === "selectType" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">What kind of bill is this?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {typeOptions.map((t) => (
                <button key={t.id} type="button" onClick={() => pickType(t.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    type === t.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}>{t.label}</button>
              ))}
            </div>
          </div>
        )}

        {phase === "selectState" && (
          <div className="space-y-2">
            <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-300"><ChevronLeft className="h-3.5 w-3.5" /> Change bill type</button>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{billTypeLabel(type)} — which state is the bill from?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {states.map((s) => (
                <button key={s} type="button" onClick={() => { setState(s); setUnlisted(false); setPhase("selectProvider"); }}
                  className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  {s} <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
              <button type="button" onClick={() => { setUnlisted(true); }}
                className="rounded-md border border-dashed border-slate-300 px-2.5 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
                My state isn't here
              </button>
            </div>
            {states.length === 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> OnePay has no verified link for {billTypeLabel(type)} in that state yet — see the safe guidance below.</p>
              </div>
            )}
          </div>
        )}

        {phase === "selectProvider" && (
          <div className="space-y-2">
            <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-300"><ChevronLeft className="h-3.5 w-3.5" /> Back</button>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{billTypeLabel(type)}{state ? ` — ${state}` : ""} — which provider?</p>
            {providerList.length > 0 ? providerList.map((p) => (
              <button key={p.id} type="button" onClick={() => { openUrl(p.url); }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{p.note}</span>
                </span>
                <ProviderIcon url={p.url} size={20} className="shrink-0" />
              </button>
            )) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> No verified provider in this {state ? "state" : "category"} — see safe guidance below.</p>
              </div>
            )}
            <button type="button" onClick={() => setUnlisted(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
              <SearchX className="h-4 w-4" /> My provider isn't listed
            </button>
          </div>
        )}

        {unlisted && (
          <div className="space-y-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                OnePay has no verified official link for this provider, so it won't open a random website. Two safe ways to pay:
              </p>
            </div>
            {bbpsSteps && <StepList steps={bbpsSteps} title="Pay via BBPS inside PhonePe or Google Pay" />}
            <StepList
              steps={["Find the payment link printed on the physical or PDF bill", "Type that exact address into your browser", "Pay there and keep the receipt"]}
              title="Or use the link printed on your bill"
              tone="muted"
            />
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
            OnePay only opens official pages. It can't complete a payment, cancel a mandate or confirm anything was paid — record the payment here only after the provider confirms it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepList({ steps, title, tone }) {
  return (
    <div className={cn("rounded-lg border p-3", tone === "muted" ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"><ListChecks className="h-3.5 w-3.5" /> {title}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}