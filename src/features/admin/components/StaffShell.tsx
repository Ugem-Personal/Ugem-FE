import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  IdCard,
  LayoutDashboard,
  Sparkles,
  Store,
  UserCheck,
} from "lucide-react";

import { UserAccountMenu } from "@/shared/components";
import { cn } from "@/lib/utils";
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
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="border-b border-white/70 bg-white/72 px-4 py-4 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:px-5 lg:py-5">
          <div className="flex h-full min-h-0 flex-col">
            <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-5 shadow-lg shadow-cyan-950/5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl" />

              <div className="relative flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-700/25">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
                    UGem Staff
                  </p>
                  <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                    Review Center
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    Điều phối hồ sơ, merchant và reviewer.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-2xl bg-cyan-50 px-3 py-2 ring-1 ring-cyan-100">
                <p className="truncate text-[11px] font-bold text-cyan-700">
                  Chờ duyệt
                </p>
                <p className="mt-0.5 truncate text-xl font-black tabular-nums text-slate-950">
                  {pendingCount}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                <p className="truncate text-[11px] font-bold text-emerald-700">
                  Đã duyệt
                </p>
                <p className="mt-0.5 truncate text-xl font-black tabular-nums text-slate-950">
                  {approvedCount}
                </p>
              </div>
            </div>

            <nav className="mt-4 grid min-w-0 gap-1.5">
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
                      "group relative flex min-h-16 min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-sm transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                      isActive
                        ? "bg-slate-950 text-white shadow-xl shadow-slate-950/15"
                        : "text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-lg hover:shadow-cyan-950/5",
                    )}
                  >
                    {isActive ? (
                      <>
                        <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-cyan-300" />
                        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_40%)]" />
                      </>
                    ) : null}

                    <span
                      className={cn(
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                        isActive
                          ? "bg-white/15 text-cyan-200"
                          : "bg-slate-100 text-slate-500 group-hover:bg-cyan-50 group-hover:text-cyan-700",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </span>

                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate whitespace-nowrap font-black">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate whitespace-nowrap text-xs font-medium",
                          isActive ? "text-white/60" : "text-slate-400",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>

                    {typeof count === "number" ? (
                      <span
                        className={cn(
                          "relative ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums",
                          isActive
                            ? "bg-white text-slate-950"
                            : "bg-slate-100 text-slate-500 group-hover:bg-cyan-100 group-hover:text-cyan-800",
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

        <main className="min-w-0">
          <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/72 px-4 py-3 shadow-lg shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">
                {pageTitle.eyebrow}
              </p>
              <h1 className="mt-1 truncate text-lg font-black tracking-tight text-slate-950">
                {pageTitle.title}
              </h1>
            </div>

            <UserAccountMenu fallbackName="Staff" />
          </header>

          <div className="p-4 sm:p-5 lg:p-7">
            <div className="rounded-3xl border border-white/70 bg-white/55 p-3 shadow-2xl shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-xl sm:p-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
