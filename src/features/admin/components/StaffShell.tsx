import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  IdCard,
  LayoutDashboard,
  Menu,
  Sparkles,
  Store,
  UserCheck,
} from "lucide-react";

import { UserAccountMenu } from "@/shared/components";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/shared/components/ModeToggle";
import { useStaffApplications } from "../hooks/useApplications";

export type StaffNavItemKey =
  | "dashboard"
  | "pending"
  | "approved"
  | "merchants"
  | "profile"
  | "reviewer-applications";

type StaffShellProps = {
  activeItem: StaffNavItemKey;
  children: ReactNode;
};

const staffNavItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Tổng quan vận hành",
    to: "/staff/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "pending",
    label: "Hồ sơ chờ duyệt",
    description: "Merchant cần xử lý",
    to: "/staff/applications",
    icon: Clock3,
  },
  {
    key: "approved",
    label: "Hồ sơ đã duyệt",
    description: "Lịch sử phê duyệt",
    to: "/staff/applications/approved",
    icon: CheckCircle2,
  },
  {
    key: "merchants",
    label: "Merchant",
    description: "Danh sách merchant",
    to: "/staff/merchants",
    icon: Store,
  },
  {
    key: "profile",
    label: "Profile Staff",
    description: "Thông tin cá nhân",
    to: "/staff/profile",
    icon: IdCard,
  },
  {
    key: "reviewer-applications",
    label: "Đơn Reviewer",
    description: "Duyệt đơn đăng ký",
    to: "/staff/reviewer-applications",
    icon: UserCheck,
  },
] satisfies {
  key: StaffNavItemKey;
  label: string;
  description: string;
  to: string;
  icon: typeof LayoutDashboard;
}[];

const staffPageTitles: Record<
  StaffNavItemKey,
  { title: string; eyebrow: string }
> = {
  dashboard: {
    eyebrow: "Staff workspace",
    title: "Tổng quan vận hành",
  },
  pending: {
    eyebrow: "Application review",
    title: "Hồ sơ chờ duyệt",
  },
  approved: {
    eyebrow: "Application history",
    title: "Hồ sơ đã duyệt",
  },
  merchants: {
    eyebrow: "Merchant directory",
    title: "Danh sách merchant",
  },
  profile: {
    eyebrow: "Staff profile",
    title: "Thông tin cá nhân",
  },
  "reviewer-applications": {
    eyebrow: "Reviewer review",
    title: "Đơn đăng ký Reviewer",
  },
};

function isPendingStatus(status?: string) {
  return !status || status.toLowerCase() === "pending";
}

export function StaffShell({ activeItem, children }: StaffShellProps) {
  const { data: applications = [] } = useStaffApplications();
  const pendingCount = applications.filter((item) =>
    isPendingStatus(item.status),
  ).length;
  const approvedCount = applications.length - pendingCount;
  const pageTitle = staffPageTitles[activeItem];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-300">
      <div className="relative grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 hidden h-dvh bg-slate-950 px-4 py-5 text-white shadow-2xl shadow-slate-950/20 lg:flex lg:flex-col justify-between">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">UGem Staff</p>
                <p className="truncate text-base font-black text-white">Review Center</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <p className="truncate text-[10px] font-bold text-amber-400">Chờ duyệt</p>
                <p className="mt-0.5 truncate text-lg font-black text-amber-300">{pendingCount}</p>
              </div>

              <div className="min-w-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <p className="truncate text-[10px] font-bold text-emerald-400">Đã duyệt</p>
                <p className="mt-0.5 truncate text-lg font-black text-emerald-300">{approvedCount}</p>
              </div>
            </div>

            <nav aria-label="Điều hướng Staff" className="grid gap-1.5 mt-2">
              {staffNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.key;
                const count =
                  item.key === "pending"
                    ? pendingCount
                    : item.key === "approved"
                      ? approvedCount
                      : undefined;

                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={cn(
                      "group flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                      isActive
                        ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                        isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/8 text-slate-300 group-hover:bg-white/12"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{item.label}</span>
                      <span className={cn("block truncate text-[11px] font-medium opacity-80", isActive ? "text-slate-950/80" : "text-slate-400")}>
                        {item.description}
                      </span>
                    </span>

                    {typeof count === "number" ? (
                      <span
                        className={cn(
                          "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
                          isActive ? "bg-slate-950 text-cyan-300" : "bg-white/10 text-slate-300"
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-col">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 sm:px-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <details className="group relative shrink-0 lg:hidden">
                <summary className="grid h-10 w-10 list-none place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs marker:content-none" aria-label="Mở menu Staff">
                  <Menu className="h-5 w-5" />
                </summary>
                <nav className="absolute left-0 top-12 z-50 grid w-[min(82vw,18rem)] gap-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 shadow-2xl" aria-label="Điều hướng Staff">
                  {staffNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.key;
                    return (
                      <Link key={item.key} to={item.to} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold", isActive ? "bg-cyan-500 text-slate-950" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </details>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  {pageTitle.eyebrow}
                </p>
                <h1 className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {pageTitle.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ModeToggle />
              <UserAccountMenu fallbackName="Staff" />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
