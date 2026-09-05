import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BellRing,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Menu,
  ScrollText,
  Users,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

import ugemLogo from "@/assets/ugem-logo.png";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/shared/components/ModeToggle";
import { UserAccountMenu } from "@/shared/components/UserAccountMenu";

type AdminShellProps = {
  children: ReactNode;
};

const adminNavItems = [
  { label: "Dashboard", description: "Tổng quan doanh thu", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Staff", description: "Quản trị đội vận hành", to: "/admin/staff", icon: Users },
  { label: "Hồ sơ merchant", description: "Duyệt onboarding", to: "/admin/applications", icon: ClipboardList },
  { label: "Reviewer", description: "Đơn đăng ký reviewer", to: "/admin/reviewer-applications", icon: FileCheck2 },
  { label: "Audit log", description: "Truy vết thao tác", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Thông báo", description: "Cập nhật hệ thống", to: "/admin/notifications", icon: BellRing },
] satisfies {
  label: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}[];

function AdminBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md transition-all duration-300", collapsed && "justify-center px-2")}>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-md">
        <img src={ugemLogo} alt="UGem" className="h-7 w-7 object-contain" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">UGem Admin</p>
              <p className="truncate text-base font-black text-slate-900 dark:text-white">Control center</p>
        </div>
      )}
    </div>
  );
}

function AdminNavigation({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="grid gap-1.5">
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                isActive
                  ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                collapsed && "justify-center px-2"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors", isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-white/8 dark:text-slate-300 dark:group-hover:bg-white/12")}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{item.label}</span>
                    <span className={cn("block truncate text-[11px] font-medium opacity-80", isActive ? "text-slate-950/80" : "text-slate-500 dark:text-slate-400")}>
                      {item.description}
                    </span>
                  </span>
                )}
                {!collapsed && (
                  <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", isActive ? "bg-slate-950" : "bg-transparent")} aria-hidden="true" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AdminBrand collapsed={collapsed} />
      <AdminNavigation onNavigate={onNavigate} collapsed={collapsed} />
      {!collapsed && (
        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Workspace Status</p>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            Quản lý doanh thu, duyệt merchant và kiểm soát vận hành real-time.
          </p>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const currentItem = adminNavItems.find((item) => location.pathname.startsWith(item.to)) || adminNavItems[0];

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Mobile Top Navbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 px-4 shadow-xs backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src={ugemLogo} alt="UGem" className="h-8 w-8 rounded-lg bg-white object-contain shadow-xs" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">UGem Admin</p>
            <p className="text-xs font-black text-slate-900 dark:text-white">Control center</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Mở menu quản trị"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className={cn("grid min-h-dvh transition-all duration-300", sidebarCollapsed ? "lg:grid-cols-[80px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]")}>
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 hidden h-dvh border-r border-slate-200 bg-white px-4 py-5 text-slate-900 shadow-2xl shadow-slate-950/10 dark:border-transparent dark:bg-slate-950 dark:text-white dark:shadow-slate-950/20 lg:flex lg:flex-col justify-between">
          <SidebarContent collapsed={sidebarCollapsed} />
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!sidebarCollapsed && <span>Thu gọn</span>}
          </button>
        </aside>

        {/* Main Content Area */}
        <div id="admin-main" className="flex min-w-0 flex-col">
          {/* Desktop Top Header Bar */}
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-6 backdrop-blur-xl lg:flex">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500">Admin</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-900 dark:text-white font-extrabold">{currentItem.label}</span>
            </div>

            <div className="flex items-center gap-3">
              <UserAccountMenu fallbackName="Admin" />
            </div>
          </header>

          {/* Page Content Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu quản trị"
          />
          <aside
            id="admin-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Menu quản trị"
            className="absolute inset-y-0 left-0 w-[min(85vw,20rem)] overflow-y-auto bg-white p-5 text-slate-900 shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col justify-between dark:bg-slate-950 dark:text-white"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-400">UGem Admin</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/8 text-white hover:bg-white/15"
                  aria-label="Đóng menu quản trị"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>

            <div className="pt-4 border-t border-white/10">
              <UserAccountMenu fallbackName="Admin" />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
