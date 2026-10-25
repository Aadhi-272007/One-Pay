import { Check, AlertTriangle, CalendarOff } from "lucide-react";

// Per-item Google Calendar sync status chip.
export default function CalendarChip({ status, error }) {
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" title="Event exists on your Google Calendar">
        <Check className="h-3 w-3" /> On calendar
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300" title={error || "Calendar sync failed"}>
        <AlertTriangle className="h-3 w-3" /> Calendar failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400" title="Not synced to Google Calendar yet — run Sync now in Settings">
      <CalendarOff className="h-3 w-3" /> Not synced
    </span>
  );
}