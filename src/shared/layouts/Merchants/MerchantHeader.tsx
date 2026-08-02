import { useEffect, useState } from "react";
import { BarChart3, ClipboardPlus, Home, Megaphone, Menu, Store, Timer, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/shared/components";
import { ModeToggle } from "@/shared/components/ModeToggle";

const merchantItems = [
  ["Nhà hàng của bạn", "/merchant/restaurant", Store],
  ["Tạo đơn tại quán", "/merchant/create-order", ClipboardPlus],
  ["Hồ sơ quán", "/merchant", Home],
  ["Trạng thái xét duyệt", "/merchant/application/status", Timer],
  ["Campaign", "/merchant/campaigns", Megaphone],
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 sm:px-6 backdrop-blur-xl transition-colors duration-300">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs lg:hidden"
          aria-label="Mở menu Merchant"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Merchant Workspace
          </p>
          <h1 className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">
            Quản Lý Hồ Sơ & Cửa Hàng
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ModeToggle />
        <UserAccountMenu fallbackName="Merchant" />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} aria-label="Đóng menu Merchant" />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,20rem)] overflow-y-auto bg-slate-950 p-4 text-white shadow-2xl animate-in slide-in-from-left duration-200" role="dialog" aria-modal="true" aria-label="Menu Merchant">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">UGem</p>
                <p className="text-base font-black">Merchant Portal</p>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10" aria-label="Đóng menu Merchant">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="grid gap-1.5" aria-label="Điều hướng Merchant">
              {items.map(([label, path, Icon]) => (
                <NavLink key={path} to={path} end={path === "/merchant"} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold", isActive ? "bg-cyan-500 text-slate-950" : "text-slate-200 hover:bg-white/10 hover:text-white")}>
                  {({ isActive }) => (
                    <><span className={cn("grid h-8 w-8 place-items-center rounded-lg", isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/8 text-slate-300")}><Icon className="h-4 w-4" /></span><span className="truncate">{label}</span></>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
