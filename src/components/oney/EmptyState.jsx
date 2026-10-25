import { Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900", className)}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
    </div>
  );
}