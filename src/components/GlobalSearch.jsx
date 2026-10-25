import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, RefreshCw, Receipt, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TYPE_ICONS = { bill: FileText, subscription: RefreshCw, expense: Receipt, payment: Receipt };

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = async (q) => {
    setQuery(q);
    if (!q || q.length < 2) { setResults([]); return; }
    setBusy(true);
    try {
      const rx = { $regex: q, $options: "i" };
      const [bills, subs, expenses, payments] = await Promise.all([
        base44.entities.Bill.filter({ $or: [{ title: rx }, { merchant: rx }] }, { limit: 5 }).catch(() => ({ items: [] })),
        base44.entities.Subscription.filter({ $or: [{ plan_name: rx }, { merchant: rx }] }, { limit: 5 }).catch(() => ({ items: [] })),
        base44.entities.Expense.filter({ $or: [{ title: rx }, { merchant: rx }] }, { limit: 5 }).catch(() => ({ items: [] })),
        base44.entities.Payment.filter({ $or: [{ title: rx }, { merchant: rx }, { reference: rx }] }, { limit: 5 }).catch(() => ({ items: [] })),
      ]);
      const list = [
        ...(bills.items ?? bills).map((r) => ({ type: "bill", label: r.title, sub: r.merchant, to: "/bills" })),
        ...(subs.items ?? subs).map((r) => ({ type: "subscription", label: r.plan_name || r.merchant, sub: r.merchant, to: "/subscriptions" })),
        ...(expenses.items ?? expenses).map((r) => ({ type: "expense", label: r.title, sub: r.merchant, to: "/history" })),
        ...(payments.items ?? payments).map((r) => ({ type: "payment", label: r.title || r.merchant, sub: r.reference || r.paid_date, to: "/history" })),
      ];
      setResults(list);
    } finally {
      setBusy(false);
    }
  };

  // One debounced search per pause in typing instead of 4 queries per keystroke.
  const onType = (q) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  };

  const navigate = useNavigate();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search payments…</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-lg">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">Search</DialogTitle>
            <DialogDescription className="sr-only">Search bills, subscriptions and expenses</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onType(e.target.value)}
                placeholder="Bills, subscriptions, merchants, expenses…"
                className="w-full bg-transparent py-2.5 text-sm outline-none dark:text-white"
              />
              {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">{query.length >= 2 ? "No matches found." : "Type at least two characters."}</p>
            ) : (
              <ul>
                {results.map((r, i) => {
                  const Icon = TYPE_ICONS[r.type];
                  return (
                    <li key={i}>
                      <button
                        onClick={() => { setOpen(false); navigate(r.to); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.label}</span>
                          <span className="block truncate text-xs text-slate-400">{r.sub}</span>
                        </span>
                        <span className={cn("rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 capitalize dark:bg-slate-800 dark:text-slate-400")}>{r.type}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}