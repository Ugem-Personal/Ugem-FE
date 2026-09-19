import { useState } from "react";
import { SidebarToggle } from "@/shared/components/SidebarToggle";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Home,
  Megaphone,
  Store,
  Timer,
  Sparkles,
  Zap,
  UtensilsCrossed,
  LifeBuoy,
  QrCode,
  ShieldAlert,
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";

type MerchantNavItem = {
  label: string;
  icon: typeof Store;
  path: string;
  end?: boolean;
  badge?: string;
  badgeColor?: string;
};

const merchantMenuItems: MerchantNavItem[] = [
  {
    label: "Tổng quan quán",
    icon: Home,
    path: "/merchant",
    end: true,
  },
  {
    label: "Thông tin nhà hàng",
    icon: Store,
    path: "/merchant/restaurant",
  },
  {
    label: "Quản lý thực đơn",
    icon: UtensilsCrossed,
    path: "/merchant/foods",
  },
  {
    label: "Check-in khách hàng",
    icon: QrCode,
    path: "/merchant/check-in",
    badge: "HOT",
    badgeColor:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    label: "Trạng thái xét duyệt",
    icon: Timer,
    path: "/merchant/application/status",
  },
  {
    label: "Chiến dịch ưu đãi",
    icon: Megaphone,
    path: "/merchant/campaigns",
    badge: "PROMO",
    badgeColor:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    label: "Thống kê lượt xem",
    icon: BarChart3,
    path: "/merchant/view-statistics",
  },
  {
    label: "Trung tâm hỗ trợ",
    icon: LifeBuoy,
    path: "/merchant/support",
  },
  {
    label: "Hồ sơ & an toàn quán",
    icon: ShieldAlert,
    path: "/merchant/governance",
  },
];

const customerMerchantMenuItems: MerchantNavItem[] = [
  {
    label: "Gửi hồ sơ mở quán",
    icon: Store,
    path: "/merchant/application/create",
    badge: "MỚI",
    badgeColor:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    label: "Trạng thái xét duyệt",
    icon: Timer,
    path: "/merchant/application/status",
  },
];

// Legacy commerce routes remain available for backward compatibility but are
// intentionally removed from the primary UFind merchant journey.
const coreMerchantMenuItems = merchantMenuItems.map((item) =>
  item.path === "/merchant/view-statistics"
    ? { ...item, label: "Merchant Analytics", badge: undefined }
    : item,
);

export function MerchantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();
  const visibleMenuItems =
    user?.Role === "Customer" || user?.Role === "Reviewer"
      ? customerMerchantMenuItems
      : coreMerchantMenuItems;

  return (
    <aside className={cn("sticky top-0 z-20 hidden h-dvh shrink-0 flex-col justify-between border-r border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 px-3.5 py-5 text-slate-900 dark:text-white backdrop-blur-2xl transition-all duration-300 lg:flex shadow-xl shadow-slate-950/5", collapsed ? "w-[80px]" : "w-[270px]")}>
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        {/* Brand Header */}
        <div className="relative shrink-0 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-xl text-white" style={{ padding: collapsed ? "12px 3px" : "14px" }}>
          <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-cyan-500/20 blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                  UFind Partner
                </span>
              </div>
              <p className="truncate text-sm font-black tracking-tight text-white mt-0.5">
                Cổng Chủ Quán
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav aria-label="Điều hướng Merchant" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          <p className={cn("px-2 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 items-center justify-between", collapsed ? "hidden" : "flex")}>
            <span>Quản lý cửa hàng</span>
            <Zap className="h-3 w-3 text-cyan-500" />
          </p>

          {visibleMenuItems.map(
            ({ label, icon: Icon, path, end, badge, badgeColor }) => (
              <NavLink
                key={label}
                to={path}
                end={end} title={label} aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-h-11 min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border-l-4 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-black shadow-xs pl-2.5"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                    collapsed && "justify-center px-0 pl-0",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/20"
                          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 group-hover:bg-slate-200/70 dark:group-hover:bg-white/10 group-hover:text-slate-900 dark:group-hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className={cn("min-w-0 flex-1 text-xs font-bold whitespace-nowrap", collapsed && "hidden")}>
                      {label}
                    </span>

                    {!collapsed && badge && (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider",
                          badgeColor ||
                            "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ),
          )}
        </nav>
      </div>

      {/* Pro Widget & Footer */}
      <div className="space-y-4 pt-4 shrink-0">
        <SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        {!collapsed && <>
        <div className="border-t border-slate-200/80 dark:border-white/10 pt-3 text-center">
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            UFind Business v2.5 Premium
          </p>
        </div>
        </>}
      </div>
    </aside>
  );
}
