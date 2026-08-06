import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ClipboardPlus,
  Home,
  Megaphone,
  Store,
  Timer,
  Sparkles,
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";

type MerchantNavItem = {
  label: string;
  icon: typeof Store;
  path: string;
  end?: boolean;
};

const merchantMenuItems: MerchantNavItem[] = [
  {
    label: "Nhà hàng của bạn",
    icon: Store,
    path: "/merchant/restaurant",
  },
  {
    label: "Tạo đơn tại quán",
    icon: ClipboardPlus,
    path: "/merchant/create-order",
  },
  {
    label: "Hồ sơ quán",
    icon: Home,
    path: "/merchant",
    end: true,
  },
  {
    label: "Trạng thái xét duyệt",
    icon: Timer,
    path: "/merchant/application/status",
  },
  {
    label: "Chiến dịch",
    icon: Megaphone,
    path: "/merchant/campaigns",
  },
  {
    label: "Thống kê lượt xem",
    icon: BarChart3,
    path: "/merchant/view-statistics",
  },
];

const customerMerchantMenuItems: MerchantNavItem[] = [
  {
    label: "Gửi hồ sơ quán",
    icon: Store,
    path: "/merchant/application/create",
  },
  {
    label: "Trạng thái xét duyệt",
    icon: Timer,
    path: "/merchant/application/status",
  },
];

export function MerchantSidebar() {
  const user = getCurrentUser();
  const visibleMenuItems =
    user?.Role === "Customer" || user?.Role === "Reviewer"
      ? customerMerchantMenuItems
      : merchantMenuItems;

  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-[240px] shrink-0 flex-col bg-white dark:bg-slate-950 px-3.5 py-4 text-slate-900 dark:text-white border-r border-slate-200/80 dark:border-slate-800/80 lg:flex justify-between transition-colors duration-300">
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 p-3 backdrop-blur-md">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">UGem</p>
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">Cổng Chủ Quán</p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav aria-label="Điều hướng Merchant" className="grid gap-1 mt-1">
          <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Quản lý quán
          </p>

          {visibleMenuItems.map(({ label, icon: Icon, path, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group relative flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                  isActive
                    ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border-l-3 border-cyan-500 dark:border-cyan-400 pl-2.5 shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                      isActive
                        ? "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-white/10 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-3 text-center">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          UGem Merchant Workspace v2.0
        </p>
      </div>
    </aside>
  );
}
