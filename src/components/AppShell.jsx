import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import {
  FileText, Layers, RefreshCw, Zap, Bell, Clock, PieChart,
  Settings as SettingsIcon, CalendarDays, LogOut, Menu, Wallet, ArrowUpRight,
  Sparkles, Users,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { applySavedTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

const MANAGE = [
  { label: "All payments", to: "/bills", icon: FileText },
  { label: "Templates", to: "/templates", icon: Layers },
  { label: "Subscriptions", to: "/subscriptions", icon: RefreshCw },
  { label: "AutoPay", to: "/autopay", icon: Zap },
  { label: "Reminders", to: "/reminders", icon: Bell },
  { label: "Shared", to: "/shared", icon: Users },
];
const INSIGHTS = [
  { label: "Ask OnePay", to: "/assistant", icon: Sparkles },
  { label: "History", to: "/history", icon: Clock },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Analytics", to: "/analytics", icon: PieChart },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

function NavSection({ title, items, onNavigate }) {
  return (
    <div className="px-3">
      <p className="px-2 pb-1.5 pt-3 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">{title}</p>
      <nav className="space-y-0.5">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ProfileFooter({ user, onSignOut }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
        {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name || "Signed in"}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
      </div>
      <button
        onClick={onSignOut}
        title="Sign out"
        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function SidebarBody({ user, onSignOut, onNavigate }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">OnePay</p>
          <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Payments hub</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavSection title="Manage" items={MANAGE} onNavigate={onNavigate} />
        <NavSection title="Insights" items={INSIGHTS} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 px-3 pb-2">
        <div className="rounded-xl bg-gradient-to-b from-[#1E2B63] to-[#151C45] p-3 text-white">
          <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase">OnePay keeps you current</p>
          <p className="mt-1 text-[12px] leading-snug text-blue-100/90">Every bill, renewal and EMI tracked in one place.</p>
          <Link to="/calendar" onClick={onNavigate} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-white hover:text-blue-200">
            View calendar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 border-t border-slate-200 px-5 py-2 dark:border-slate-700">
        <Link to="/about" onClick={onNavigate} className="text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">About</Link>
        <Link to="/contact" onClick={onNavigate} className="text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Contact</Link>
      </div>
      <ProfileFooter user={user} onSignOut={onSignOut} />
    </div>
  );
}

export default function AppShell() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    applySavedTheme();
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const signOut = async () => {
    await base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-slate-200 dark:border-slate-800 lg:block">
        <SidebarBody user={user} onSignOut={signOut} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-3 left-3 z-40 lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[270px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody user={user} onSignOut={signOut} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="ml-9 lg:ml-0"><GlobalSearch /></div>
          <div className="ml-auto"><NotificationBell /></div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}