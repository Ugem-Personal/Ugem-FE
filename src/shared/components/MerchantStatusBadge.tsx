import { CheckCircle2, Clock, Ban, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type MerchantStatusBadgeProps = {
  status?: string | null;
  className?: string;
  showIcon?: boolean;
};

export function MerchantStatusBadge({
  status,
  className,
  showIcon = true,
}: MerchantStatusBadgeProps) {
  const normalized = (status ?? "").trim().toLowerCase();

  switch (normalized) {
    case "active":
    case "approved":
    case "accept":
    case "accepted":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400",
            className,
          )}
        >
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5" />}
          <span>ĐANG HOẠT ĐỘNG</span>
        </span>
      );

    case "inactive":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-slate-400/30 bg-slate-500/10 px-3 py-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-400",
            className,
          )}
        >
          {showIcon && <Clock className="h-3.5 w-3.5" />}
          <span>TẠM ĐÓNG CỬA</span>
        </span>
      );

    case "pending":
    case "underreview":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400",
            className,
          )}
        >
          {showIcon && <Clock className="h-3.5 w-3.5" />}
          <span>ĐANG THẨM ĐỊNH</span>
        </span>
      );

    case "suspended":
    case "rejected":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400",
            className,
          )}
        >
          {showIcon && <Ban className="h-3.5 w-3.5" />}
          <span>ĐÌNH CHỈ / TỪ CHỐI</span>
        </span>
      );

    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-400",
            className,
          )}
        >
          {showIcon && <HelpCircle className="h-3.5 w-3.5" />}
          <span>{status || "CHƯA XÁC ĐỊNH"}</span>
        </span>
      );
  }
}

export default MerchantStatusBadge;
