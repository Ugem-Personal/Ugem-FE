import { useEffect, useState } from "react";
import { BarChart3, ClipboardPlus, Home, Megaphone, Menu, Store, Timer, X, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

import { getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/shared/components";

const merchantItems = [
  ["Hồ sơ quán", "/merchant", Home],
  ["Nhà hàng của bạn", "/merchant/restaurant", Store],
  ["Tạo đơn tại quán", "/merchant/create-order", ClipboardPlus],
  ["Trạng thái xét duyệt", "/merchant/application/status", Timer],
  ["Chiến dịch", "/merchant/campaigns", Megaphone],
  ["Thống kê lượt xem", "/merchant/view-statistics", BarChart3],
] as const;

const applicantItems = [
  ["Gửi hồ sơ quán", "/merchant/application/create", Store],
  ["Trạng thái xét duyệt", "/merchant/application/status", Timer],
] as const;

export function MerchantHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getCurrentUser()?.Role;
  const items = role === "Customer" || role === "Reviewer" ? applicantItems : merchantItems;

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 px-4 sm:px-6 lg:px-8 backdrop-blur-xl transition-colors duration-300 shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs lg:hidden hover:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          aria-label="Mở menu Merchant"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                KHÔNG GIANG CHỦ QUÁN
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM ONLINE
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Quản lý hồ sơ cửa hàng
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UserAccountMenu fallbackName="Chủ quán" />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu Merchant"
          />
          <aside className="relative flex h-full w-[270px] max-w-[85vw] flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400">UGem Partner</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white">Cổng Chủ Quán</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {items.map(([label, path, Icon]) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition",
                        isActive
                          ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-black border-l-3 border-cyan-500"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
