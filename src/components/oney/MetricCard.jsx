import { cn } from "@/lib/utils";

const TONES = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  red: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function MetricCard({ label, value, sub, icon: Icon, tone = "blue", className }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900", className)}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">{label}</p>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", TONES[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}