import {
  Clock,
  ChevronRight,
  MapPin,
  FileText,
  Star,
  Store,
  Check,
  XCircle,
  QrCode,
} from "lucide-react";
import type { CustomerOrderSummary } from "@/shared/types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { getCustomerOrderId } from "../services/orderService";
import { isCustomerConfirmationReady } from "@/shared/lib/order-status";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: CustomerOrderSummary;
  fallbackOrderNumber: number;
  onViewDetail: (order: CustomerOrderSummary, fallbackOrderNumber: number) => void;
  onQuickReview?: (order: CustomerOrderSummary) => void;
  onQuickConfirm?: (order: CustomerOrderSummary) => void;
  className?: string;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function OrderCard({
  order,
  fallbackOrderNumber,
  onViewDetail,
  onQuickReview,
  onQuickConfirm,
  className,
}: OrderCardProps) {
  const orderId = getCustomerOrderId(order);
  const isPaid =
    order.paymentStatus?.toLowerCase() === "paid" ||
    order.status?.toLowerCase() === "completed";

  const isCompleted = isPaid;

  const isOfflineOrder =
    order.orderType?.trim().toLowerCase() === "offline" ||
    (order.deliveryAddress ?? "").toLowerCase().includes("tại quán");

  const isBillConfirmed =
    !isPaid &&
    (((order as any)?.bill?.status?.toLowerCase() === "confirmed" &&
      order.status?.toLowerCase() !== "ready") ||
      order.status?.toLowerCase() === "billconfirmed");

  const isCashPending = !isPaid && order.status?.toLowerCase() === "cashpending";

  const isReadyToConfirm =
    !isPaid &&
    isCustomerConfirmationReady(
      order.status,
      isOfflineOrder ? "Offline" : "Online",
    );

  const displayStatus = isPaid
    ? "completed"
    : isBillConfirmed
      ? "billconfirmed"
      : isCashPending
        ? "cashpending"
        : order.status;

  let confirmButtonText = isOfflineOrder ? "Kiểm tra & Thanh toán bill" : "Đã nhận hàng";
  let confirmButtonIcon = Check;

  if (isBillConfirmed) {
    confirmButtonText = "Xem mã QR thanh toán";
    confirmButtonIcon = QrCode;
  } else if (isCashPending) {
    confirmButtonText = "Chờ quán xác nhận tiền mặt";
    confirmButtonIcon = Clock;
  }

  const ButtonIcon = confirmButtonIcon;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết đơn ${order.name || fallbackOrderNumber}`}
      onClick={() => onViewDetail(order, fallbackOrderNumber)}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewDetail(order, fallbackOrderNumber);
        }
      }}
      className={cn(
        "group relative overflow-hidden cursor-pointer rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-5 shadow-xs backdrop-blur-xl transition-all duration-300 hover:border-cyan-400 dark:hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-950/5 active:scale-[0.995]",
        className,
      )}
    >
      {/* Top Bar: Merchant / Order Info & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
            <Store className="h-5.5 w-5.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {order.name || `Đơn hàng #${fallbackOrderNumber}`}
              </h3>

              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                  isOfflineOrder
                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50"
                    : "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50",
                )}
              >
                {isOfflineOrder ? "Tại quán" : "Giao tận nơi"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{new Date(order.orderedAt).toLocaleString("vi-VN")}</span>
              {orderId && (
                <span className="font-mono text-slate-400 dark:text-slate-600">
                  #{orderId.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <OrderStatusBadge status={displayStatus} />

          <span className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {formatCurrency(order.finalPrice)}
          </span>
        </div>
      </div>

      {/* Middle: Details & Notes */}
      <div className="pt-3.5 space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        {order.deliveryAddress && !isOfflineOrder && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-500 mt-0.5" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
        )}

        {order.notes && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200/50 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/40 p-2.5 text-amber-900 dark:text-amber-200">
            <FileText className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span className="line-clamp-2">Ghi chú: {order.notes}</span>
          </div>
        )}

        {order.rejectionReason &&
          (order.status?.toLowerCase() === "rejected" ||
            order.status?.toLowerCase() === "cancelled") && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/60 p-2.5 text-rose-900 dark:text-rose-200">
              <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span className="line-clamp-2 font-bold">
                Lý do từ chối: {order.rejectionReason}
              </span>
            </div>
          )}
      </div>

      {/* Bottom Bar: Action buttons */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
        <span className="text-xs font-black text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition flex items-center gap-1">
          Xem chi tiết đơn <ChevronRight className="h-4 w-4" />
        </span>

        <div className="flex items-center gap-2">
          {isReadyToConfirm && onQuickConfirm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickConfirm(order);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition shadow-sm",
                isBillConfirmed
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold"
                  : isCashPending
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "bg-cyan-600 text-white hover:bg-cyan-500",
              )}
            >
              <ButtonIcon className="h-3.5 w-3.5" />
              {confirmButtonText}
            </button>
          )}

          {isCompleted && onQuickReview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickReview(order);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-cyan-500 px-3.5 py-1.5 text-xs font-black text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-cyan-400 transition shadow-sm"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Đánh giá
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-slate-900/60 p-5 animate-pulse shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="mt-4 h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
    </div>
  );
}
