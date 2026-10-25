import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const refreshTimer = useRef(null);

  const load = async () => {
    try {
      const page = await base44.entities.Notification.filter({}, { sort: "-created_date", limit: 20 });
      setItems(page.items ?? page);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    // Batch bursts: when several notifications arrive at once (syncs, sweeps),
    // reload once after things settle instead of once per event.
    const unsub = base44.entities.Notification.subscribe?.(() => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 5000);
    });
    return () => { clearTimeout(refreshTimer.current); try { unsub && unsub(); } catch {} };
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    const unreadItems = items.filter((n) => !n.read);
    if (unreadItems.length) {
      await base44.entities.Notification.bulkUpdate(unreadItems.map((n) => ({ id: n.id, read: true })));
      load();
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-xs text-blue-600 dark:text-blue-400">
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <BellRing className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500 dark:text-slate-400">You're all caught up.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((n) => (
                <li key={n.id} className={cn("px-4 py-3", !n.read && "bg-blue-50/60 dark:bg-blue-500/5")}>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{n.category || "general"} · {(n.created_date || "").slice(0, 16).replace("T", " ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}