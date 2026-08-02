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
    label: "Campaign",
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
    <aside className="sticky top-0 z-20 hidden h-dvh w-[280px] shrink-0 flex-col bg-slate-950 px-4 py-5 text-white shadow-2xl shadow-slate-950/20 lg:flex justify-between">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">UGem</p>
            <p className="truncate text-base font-black text-white">Merchant Portal</p>
          </div>
        </div>

        <nav aria-label="Điều hướng Merchant" className="grid gap-1.5 mt-2">
          <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Main Menu
          </p>

          {visibleMenuItems.map(({ label, icon: Icon, path, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                  isActive
                    ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                      isActive
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-white/8 text-slate-300 group-hover:bg-white/12"
                    )}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-xs font-bold">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
