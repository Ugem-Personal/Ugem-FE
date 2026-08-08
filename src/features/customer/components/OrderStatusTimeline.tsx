import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderStatusTimelineProps {
  status?: string | null;
  orderType?: "Online" | "Offline" | string | null;
  orderedAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  deliveringAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string | null;
  className?: string;
}

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  timestamp?: string;
};

export function OrderStatusTimeline({
  status,
  orderType = "Online",
  orderedAt,
  acceptedAt,
  preparingAt,
  readyAt,
  deliveringAt,
  completedAt,
  rejectedAt,
  rejectionReason,
  className,
}: OrderStatusTimelineProps) {
  const normalizedStatus = (status ?? "").trim().toLowerCase();
  const isOffline =
    orderType?.trim().toLowerCase() === "offline" ||
    orderType?.trim().toLowerCase() === "tại quán";

  const isRejected = normalizedStatus === "rejected";
  const isCancelled = normalizedStatus === "cancelled";
  const isNotReceived = normalizedStatus === "notreceived";

  if (isRejected || isCancelled || isNotReceived) {
    return (
      <div
        className={cn(
          "rounded-3xl border p-5 sm:p-6 shadow-xs backdrop-blur-xl transition-colors",
          isRejected && "border-rose-200 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200",
          isCancelled && "border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-300",
          isNotReceived && "border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
          className,
        )}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md",
              isRejected && "bg-rose-600",
              isCancelled && "bg-slate-700",
              isNotReceived && "bg-amber-600",
            )}
          >
            {isRejected && <XCircle className="h-5 w-5" />}
            {isCancelled && <Ban className="h-5 w-5" />}
            {isNotReceived && <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-base font-black tracking-tight">
              {isRejected && "Đơn hàng đã bị từ chối"}
              {isCancelled && "Đơn hàng đã bị hủy"}
              {isNotReceived && "Khách hàng báo chưa nhận được đơn"}
            </h4>
            <p className="mt-1 text-xs font-medium opacity-90 leading-relaxed">
              {isRejected &&
                (rejectionReason
                  ? `Lý do: ${rejectionReason}`
                  : "Quán ăn không thể tiếp nhận đơn hàng tại thời điểm này.")}
              {isCancelled && "Đơn hàng đã được hủy khỏi hệ thống."}
              {isNotReceived &&
                "Hệ thống đã ghi nhận phản hồi chưa nhận được hàng của bạn."}
            </p>
            {rejectedAt && (
              <p className="mt-2 text-[11px] font-bold opacity-75">
                Thời gian: {new Date(rejectedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Steps definition based on OrderType
  const steps: TimelineStep[] = [
    {
      key: "pending",
      label: "Đã đặt đơn",
      description: "Đã tạo đơn thành công",
      icon: Clock,
      timestamp: orderedAt,
    },
    {
      key: "accepted",
      label: "Quán nhận đơn",
      description: "Nhà hàng đã tiếp nhận",
      icon: CheckCircle2,
      timestamp: acceptedAt,
    },
    {
      key: "preparing",
      label: "Đang chế biến",
      description: "Đang chuẩn bị món ăn",
      icon: ChefHat,
      timestamp: preparingAt,
    },
    isOffline
      ? {
          key: "ready",
          label: "Sẵn sàng tại bàn",
          description: "Món đã chế biến xong",
          icon: PackageCheck,
          timestamp: readyAt,
        }
      : {
          key: "delivering",
          label: "Đang giao hàng",
          description: "Tài xế đang vận chuyển",
          icon: Bike,
          timestamp: deliveringAt || readyAt,
        },
    {
      key: "completed",
      label: "Hoàn thành",
      description: "Đã nhận hàng thành công",
      icon: CheckCircle2,
      timestamp: completedAt,
    },
  ];

  const statusOrder = ["pending", "accepted", "preparing", isOffline ? "ready" : "delivering", "completed"];
  let currentIndex = statusOrder.indexOf(normalizedStatus);
  if (currentIndex === -1) {
    if (normalizedStatus === "ready" && !isOffline) {
      currentIndex = 2; // Keep at "preparing" / ready state until merchant clicks "Bắt đầu giao hàng"
    } else {
      currentIndex = 0;
    }
  }

  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-xs backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
          Tiến trình đơn hàng ({isOffline ? "Tại quán" : "Giao hàng"})
        </h4>
      </div>

      <div className="relative flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-2">
        {/* Progress Line on Desktop */}
        <div className="hidden sm:block absolute left-8 right-8 top-5 h-1 bg-slate-200 dark:bg-slate-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
            style={{
              width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.key}
              className="relative z-10 flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center flex-1 w-full sm:w-auto"
            >
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 transition-all duration-300 shadow-md",
                  isDone
                    ? "border-cyan-500 bg-slate-950 dark:bg-cyan-500 text-cyan-400 dark:text-slate-950 shadow-cyan-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500",
                  isCurrent && "ring-4 ring-cyan-500/30 scale-110",
                )}
              >
                <StepIcon className="h-4.5 w-4.5" />
              </div>

              <div>
                <p
                  className={cn(
                    "text-xs font-black tracking-tight",
                    isDone
                      ? "text-slate-950 dark:text-white"
                      : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {step.description}
                </p>
                {step.timestamp && (
                  <p className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-bold mt-0.5">
                    {new Date(step.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
