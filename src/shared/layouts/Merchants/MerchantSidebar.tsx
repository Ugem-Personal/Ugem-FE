import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ClipboardPlus,
  Home,
  Megaphone,
  Store,
  Timer,
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
    <aside className="sticky top-0 z-20 flex h-screen w-[280px] shrink-0 flex-col border-r border-white/70 bg-white/72 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl">
      <div className="flex h-20 items-center border-b border-white/70 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-700/25">
            <Store size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">
              UGem
            </p>
            <strong className="block truncate text-lg font-black tracking-tight text-slate-950">
              Merchant Portal
            </strong>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <p className="px-3 pb-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Main menu
        </p>

        <div className="grid gap-1.5">
          {visibleMenuItems.map(({ label, icon: Icon, path, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group relative flex min-h-14 min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-sm transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                  isActive
                    ? "bg-slate-950 text-white shadow-xl shadow-slate-950/15"
                    : "text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-lg hover:shadow-cyan-950/5",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <>
                      <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-cyan-300" />
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_40%)]" />
                    </>
                  ) : null}

                  <span
                    className={cn(
                      "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                      isActive
                        ? "bg-white/15 text-cyan-200"
                        : "bg-slate-100 text-slate-500 group-hover:bg-cyan-50 group-hover:text-cyan-700",
                    )}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="relative min-w-0 flex-1 truncate font-black">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
