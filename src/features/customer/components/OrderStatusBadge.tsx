import {
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Bike,
  AlertTriangle,
  Ban,
  Banknote,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatusKey =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Delivering"
  | "Completed"
  | "Rejected"
  | "NotReceived"
  | "Cancelled"
  | string;

export type PaymentStatusKey = "Pending" | "Paid" | "Rejected" | string;

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: "Chờ xác nhận",
    className:
      "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
    icon: Clock,
    description: "Đang chờ quán chấp nhận đơn",
  },
  accepted: {
    label: "Đã nhận đơn",
    className:
      "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300",
    icon: CheckCircle2,
    description: "Quán đã chấp nhận và lên đơn",
  },
  preparing: {
    label: "Đang chuẩn bị",
    className:
      "border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300",
    icon: ChefHat,
    description: "Quán đang nấu và đóng gói món",
  },
  ready: {
    label: "Sẵn sàng",
    className:
      "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300",
    icon: PackageCheck,
    description: "Món đã làm xong, sẵn sàng phục vụ/giao",
  },
  delivering: {
    label: "Đang giao hàng",
    className:
      "border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300",
    icon: Bike,
    description: "Tài xế đang giao món tới địa chỉ của bạn",
  },
  completed: {
    label: "Hoàn thành",
    className:
      "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
    icon: CheckCircle2,
    description: "Đơn hàng đã được hoàn tất thành công",
  },
  rejected: {
    label: "Đã từ chối",
    className:
      "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300",
    icon: XCircle,
    description: "Đơn bị quán từ chối",
  },
  notreceived: {
    label: "Khách báo chưa nhận",
    className:
      "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300",
    icon: AlertTriangle,
    description: "Khách báo chưa nhận được hàng",
  },
  cancelled: {
    label: "Đã hủy",
    className:
      "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    icon: Ban,
    description: "Đơn hàng đã bị hủy",
  },
  billconfirmed: {
    label: "Chờ chuyển khoản",
    className:
      "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold",
    icon: Sparkles,
    description: "Khách đã xác nhận hóa đơn, đang mở QR thanh toán",
  },
  cashpending: {
    label: "Chờ xác nhận tiền mặt",
    className:
      "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold",
    icon: Banknote,
    description: "Khách đã yêu cầu thanh toán bằng tiền mặt",
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: "Chưa thanh toán",
    className:
      "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
    icon: Banknote,
  },
  paid: {
    label: "Đã thanh toán",
    className:
      "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Thanh toán thất bại",
    className:
      "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300",
    icon: XCircle,
  },
};

interface OrderStatusBadgeProps {
  status?: OrderStatusKey | null;
  type?: "order" | "payment";
  className?: string;
  showIcon?: boolean;
}

export function OrderStatusBadge({
  status,
  type = "order",
  className,
  showIcon = true,
}: OrderStatusBadgeProps) {
  const normalized = (status ?? "").trim().toLowerCase();
  const configMap = type === "payment" ? PAYMENT_STATUS_CONFIG : ORDER_STATUS_CONFIG;
  const config = configMap[normalized] || {
    label: status || "Chưa xác định",
    className:
      "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    icon: Sparkles,
  };

  const IconComponent = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold shadow-2xs backdrop-blur-md transition-colors",
        config.className,
        className,
      )}
    >
      {showIcon && <IconComponent className="h-3.5 w-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}


