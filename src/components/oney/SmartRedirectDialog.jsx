import { useEffect, useState } from "react";
import { ExternalLink, Smartphone, Loader2, AlertTriangle, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { buildAppTargets, UPI_APPS, tryDeepLink } from "@/lib/smartRedirect";
import { cn } from "@/lib/utils";

// Smart launcher for one subscription. mode: "app" (open the merchant app/site)
// or "autopay" (open a UPI app on its AutoPay mandate screen + steps).
export default function SmartRedirectDialog({ open, mode, sub, onOpenChange }) {
  const targets = mode === "app" ? buildAppTargets(sub) : null;
  const [upiId, setUpiId] = useState("phonepe");
  const [phase, setPhase] = useState("ready"); // ready | trying | failed
  const [failNote, setFailNote] = useState("");

  const upi = UPI_APPS.find((a) => a.id === upiId) || UPI_APPS[0];
  const active = mode === "app" ? targets : upi;

  useEffect(() => {
    if (open) { setPhase("ready"); setFailNote(""); setUpiId("phonepe"); }
  }, [open, mode]);

  const launch = async () => {
    if (mode === "app" && !active.scheme) {
      // No real deep link for this merchant — go straight to its official site.
      window.open(active.webUrl, "_blank", "noopener");
      return;
    }
    setPhase("trying");
    setFailNote("");
    const result = await tryDeepLink(active.scheme);
    if (result === "opened") {
      setPhase("ready");
      onOpenChange(false);
    } else {
      setPhase("failed");
      setFailNote(`Couldn't open ${active.name} — it may not be installed on this device, or the browser blocked the link.`);
    }
  };

  const openWeb = (url) => url && window.open(url, "_blank", "noopener");

  const title = mode === "app" ? `Open ${active.name || "app"}` : "Manage AutoPay mandate";
  const steps = active.steps || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "app"
              ? `${sub?.plan_name || ""} · ${sub?.merchant || ""} — opens the app, or its official website if the app isn't installed.`
              : `${sub?.plan_name || ""} · ${sub?.merchant || ""} — opens your UPI app; AutoPay mandates are managed there, not in OnePay.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "autopay" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Which app holds the mandate?</p>
            <div className="flex flex-wrap gap-1.5">
              {UPI_APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setUpiId(a.id); setPhase("ready"); setFailNote(""); }}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    upiId === a.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >{a.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {mode === "app" && active.scheme && (
            <Button onClick={launch} disabled={phase === "trying"}>
              {phase === "trying" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Smartphone className="mr-1.5 h-4 w-4" />}
              {phase === "trying" ? "Opening app…" : `Open ${active.name} app`}
            </Button>
          )}
          {mode === "autopay" && upi.scheme && (
            <Button onClick={launch} disabled={phase === "trying"}>
              {phase === "trying" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Smartphone className="mr-1.5 h-4 w-4" />}
              {phase === "trying" ? "Opening app…" : `Open ${upi.name}`}
            </Button>
          )}
          <Button variant="outline" onClick={() => openWeb(mode === "app" ? targets.webUrl : upi.storeUrl || null)}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {mode === "app" ? (targets.matched ? "Official website" : "Find official site") : (upi.storeUrl ? "Install app" : "No store link")}
          </Button>
          {mode === "autopay" && upi.storeUrl === null && (
            <Button variant="outline" onClick={() => openWeb("https://www.bhimupi.org.in")}>
              <ExternalLink className="mr-1.5 h-4 w-4" /> About UPI AutoPay
            </Button>
          )}
        </div>

        {phase === "failed" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {failNote}
            </p>
            <p className="mt-1.5 text-xs text-amber-700/80 dark:text-amber-200/70">
              Use the fallback buttons above, or follow the steps below inside the app manually.
            </p>
          </div>
        )}

        {mode === "app" && !targets.matched && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              OnePay doesn't have a verified deep link for “{targets.name}” — it will search for the official site instead.
            </p>
          </div>
        )}

        {steps.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <ListChecks className="h-3.5 w-3.5" /> Steps to reach the right screen in {active.name}
            </p>
            <ol className="mt-2 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
            OnePay only opens these screens — it can't cancel a subscription, stop a mandate or confirm a payment.
            {mode === "app" && targets.accountUrl && (
              <> Manage the plan at <button type="button" className="underline underline-offset-2" onClick={() => openWeb(targets.accountUrl)}>{new URL(targets.accountUrl).hostname}</button>.</>
            )}
            Make any change inside the app itself and verify it there.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}