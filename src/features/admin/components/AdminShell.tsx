import type { ComponentType, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BellRing,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Users,
} from "lucide-react";

import ugemLogo from "@/assets/ugem-logo.png";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: ReactNode;
};

const adminNavItems = [
  {
    label: "Dashboard",
    description: "Revenue console",
    to: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Staff",
    description: "Quản trị đội vận hành",
    to: "/admin/staff",
    icon: Users,
  },
  {
    label: "Merchant hồ sơ",
    description: "Duyệt onboarding",
    to: "/admin/applications",
    icon: ClipboardList,
  },
  {
    label: "Reviewer",
    description: "Đơn đăng ký reviewer",
    to: "/admin/reviewer-applications",
    icon: FileCheck2,
  },
  {
    label: "Notifications",
    description: "Thông báo hệ thống",
    to: "/admin/notifications",
    icon: BellRing,
  },
] satisfies {
  label: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}[];

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="border-b border-white/80 bg-slate-950 px-4 py-4 text-white shadow-2xl shadow-slate-950/20 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:px-5 lg:py-6">
          <div className="flex h-full min-h-0 flex-col gap-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
                <img
                  src={ugemLogo}
                  alt="UGem"
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-cyan-200">
                  UGem Admin
                </p>
                <h2 className="truncate text-lg font-black">
                  Revenue Console
                </h2>
              </div>
            </div>

            <nav className="grid gap-1.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3 py-3 transition",
                        isActive
                          ? "bg-white text-slate-950 shadow-xl shadow-cyan-950/20"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                            isActive
                              ? "bg-cyan-50 text-cyan-700"
                              : "bg-white/8 text-slate-300 group-hover:bg-white/12",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block truncate text-xs font-medium",
                              isActive ? "text-slate-500" : "text-slate-500",
                            )}
                          >
                            {item.description}
                          </span>
                        </span>
                        {isActive ? (
                          <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="grid gap-3 lg:mt-auto">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-black uppercase text-cyan-200">
                  Workspace
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Revenue, merchant và workflow admin trong một console.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
