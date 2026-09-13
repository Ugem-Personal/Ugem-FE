import { useState } from "react";
import { SidebarToggle } from "@/shared/components/SidebarToggle";
import {
  Building2,
  Camera,
  ShieldCheck,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type OnboardingSidebarProps = {
  currentStep?: number;
  onStepClick?: (step: number) => void;
};

export function OnboardingSidebar({
  currentStep = 1,
  onStepClick,
}: OnboardingSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isStatusPage = location.pathname.includes("/application/status");
  const progressPercent = isStatusPage
    ? 100
    : Math.round((Math.min(currentStep, 3) / 3) * 100);

  const steps = [
    {
      stepNumber: 1,
      label: "Thông tin & Vị trí",
      description: "Tên quán, SĐT, ghim Map",
      icon: Building2,
    },
    {
      stepNumber: 2,
      label: "Hình ảnh quán",
      description: "Mặt tiền, không gian",
      icon: Camera,
    },
    {
      stepNumber: 3,
      label: "Hồ sơ pháp lý",
      description: "CCCD & Giấy phép KD",
      icon: ShieldCheck,
    },
  ];

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-dvh shrink-0 flex-col justify-between border-r border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 px-4 py-5 text-slate-900 dark:text-white backdrop-blur-2xl transition-all duration-300 lg:flex shadow-xl shadow-slate-950/5",
        collapsed ? "w-[80px]" : "w-[260px]",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        {/* Brand Header */}
        <div
          className="relative shrink-0 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-xl text-white cursor-pointer"
          style={{ padding: collapsed ? "12px 3px" : "14px" }}
          onClick={() => navigate("/merchant")}
        >
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
                Mở Quán Trên UFind
              </p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        {!collapsed && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">Tiến trình hồ sơ</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-black">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Navigation Steps */}
        <nav aria-label="Các bước đăng ký" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Các bước gửi duyệt
            </p>
          )}

          {steps.map(({ stepNumber, label, description, icon: Icon }) => {
            const isActive = !isStatusPage && currentStep === stepNumber;
            const isDone = !isStatusPage && currentStep > stepNumber;

            return (
              <button
                key={stepNumber}
                type="button"
                title={label}
                onClick={() => {
                  if (onStepClick && !isStatusPage) {
                    onStepClick(stepNumber);
                  } else if (isStatusPage) {
                    navigate("/merchant/application/create");
                  }
                }}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border-l-4 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs pl-2.5"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                  collapsed && "justify-center px-0 pl-0",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-200 text-xs font-black",
                    isActive
                      ? "bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25"
                      : isDone
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {stepNumber}. {label}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              title="Theo dõi trạng thái"
              onClick={() => navigate("/merchant/application/status")}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200",
                isStatusPage
                  ? "bg-gradient-to-r from-cyan-500/15 to-transparent border-l-4 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold pl-2.5"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                collapsed && "justify-center px-0 pl-0",
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:text-cyan-600">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                  Theo dõi trạng thái
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  Xem kết quả xét duyệt
                </p>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Footer Toggle */}
      <div className="space-y-4 pt-4 shrink-0">
        <SidebarToggle
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
        {!collapsed && (
          <div className="border-t border-slate-200/80 dark:border-white/10 pt-3 text-center">
            <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              UFind Merchant v2.5
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
