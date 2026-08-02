import { useEffect, useRef, useState } from "react";
import {
  Bike,
  Check,
  ChefHat,
  Eye,
  PackageCheck,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import {
  acceptOrder,
  confirmCashPayment,
  getMerchantCheckInQr,
  getMerchantOrderDetail,
  getMerchantOrders,
  rejectOrder,
  updateBill,
  updateMerchantOrderStatus,
} from "../services";
import type {
  CustomerOrderDetailItem,
  MerchantOrderSummary,
} from "@/shared/types";
import { notify } from "@/shared/lib/notify";
import {
  getMerchantOrderAction,
  getOrderStatusLabel,
  normalizeOrderStatus,
} from "@/shared/lib/order-status";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type OrderItemTopping = {
  id?: string;
  name?: string;
  price?: number;
};

type MerchantOrderDetailItem = Omit<CustomerOrderDetailItem, "toppings"> & {
  notes?: string;
  unitPrice?: number;
  toppings?: OrderItemTopping[];
};

type MerchantOrderDetailPayload = {
  foods?: MerchantOrderDetailItem[];
  notes?: string;
  finalPrice?: number;
};

function formatCurrency(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}đ`;
}

function toCurrencyNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getOrderStatusKey(status?: string | null) {
  return normalizeOrderStatus(status);
}

function getOrderStatusChipClass(status?: string | null) {
  const statusKey = getOrderStatusKey(status);

  if (statusKey === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statusKey === "accepted" || statusKey === "billconfirmed") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (statusKey === "preparing") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (statusKey === "ready") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }

  if (statusKey === "delivering") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statusKey === "pending" || statusKey === "cashpending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statusKey === "rejected" || statusKey === "billrejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getOrderTypeLabel(orderType?: string | null) {
  return orderType?.trim().toLowerCase() === "offline" ? "Offline" : "Online";
}

function getOrderTypeChipClass(orderType?: string | null) {
  return orderType?.trim().toLowerCase() === "offline"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

function canGenerateCheckInQr(
  status?: string | null,
  orderType?: string | null,
) {
  const statusKey = getOrderStatusKey(status);

  if (orderType?.trim().toLowerCase() !== "offline") {
    return false;
  }

  return (
    statusKey === "ready" ||
    statusKey === "billupdated" ||
    statusKey === "billconfirmed"
  );
}

function getOrderActionMessage(
  status?: string | null,
  orderType?: string | null,
) {
  const statusKey = getOrderStatusKey(status);
  const orderTypeKey = orderType?.trim().toLowerCase();

  if (statusKey === "accepted") {
    return "Đơn đã được nhận. Bắt đầu chuẩn bị khi bếp sẵn sàng.";
  }

  if (statusKey === "preparing") {
    return "Bếp đang chuẩn bị món. Cập nhật khi toàn bộ đơn đã sẵn sàng.";
  }

  if (statusKey === "ready") {
    return orderTypeKey === "offline"
      ? "Đơn đã sẵn sàng tại quán, chờ khách check-in và xác nhận."
      : "Đơn đã đóng gói xong, sẵn sàng bàn giao để giao hàng.";
  }

  if (statusKey === "delivering") {
    return "Đơn đang được giao, chờ khách xác nhận đã nhận hàng.";
  }

  if (statusKey === "billconfirmed") {
    return "Khách đã xác nhận bill. Có thể tạo lại QR check-in nếu cần.";
  }

  if (statusKey === "cashpending") {
    return "Khách đã thanh toán tiền mặt, chờ merchant xác nhận để hoàn tất check-in.";
  }

  if (statusKey === "billupdated") {
    return "Bill đã được cập nhật, có thể tạo lại QR check-in.";
  }

  if (statusKey === "billrejected") {
    return "Khách đã từ chối bill, hãy cập nhật hóa đơn.";
  }

  if (statusKey === "completed") {
    return orderTypeKey === "offline"
      ? "Đơn offline đã hoàn tất, không còn QR check-in."
      : "Đơn online đã hoàn tất.";
  }

  if (statusKey === "rejected") {
    return "Đơn đã bị từ chối.";
  }

  return "Chỉ có thể duyệt đơn đang ở trạng thái Pending.";
}

function getDetailItems(detail: MerchantOrderDetailPayload | null) {
  if (!detail) return [];
  return detail.foods ?? [];
}

function getDetailNote(detail: MerchantOrderDetailPayload | null) {
  return detail?.notes ?? "";
}

function getLockedOrderMessage(status?: string | null) {
  const statusKey = getOrderStatusKey(status);

  if (statusKey === "accepted") {
    return "Đơn đã được chấp nhận, có thể tạo QR xác nhận bill.";
  }

  if (statusKey === "billconfirmed") {
    return "Khách đã xác nhận bill, chờ khách thanh toán và hoàn tất check-in.";
  }

  if (statusKey === "cashpending") {
    return "Khách đã thanh toán tiền mặt, chờ merchant xác nhận để hoàn tất check-in.";
  }

  if (statusKey === "billupdated") {
    return "Bill đã được cập nhật, có thể tạo lại QR để khách xác nhận.";
  }

  if (statusKey === "billrejected") {
    return "Khách đã từ chối bill, hãy cập nhật hóa đơn.";
  }

  if (statusKey === "completed") {
    return "Đơn đã hoàn tất, không thể duyệt lại.";
  }

  if (statusKey === "rejected") {
    return "Đơn đã bị từ chối, không thể duyệt lại.";
  }

  return "Chỉ có thể duyệt đơn đang ở trạng thái Pending.";
}

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<MerchantOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] =
    useState<MerchantOrderDetailPayload | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const generatingQrRef = useRef(new Set<string>());

  const selectedOrder = orders.find(
    (order) => order.orderId === selectedOrderId,
  );

  async function loadOrders(
    shouldCommit = () => true,
    options: { silent?: boolean } = {},
  ) {
    if (!options.silent) {
      setLoading(true);
    }

    try {
      const data = await getMerchantOrders();

      if (shouldCommit()) {
        setOrders(data ?? []);
        setQrUrls((current) => {
          const next = { ...current };

          for (const orderId of Object.keys(current)) {
            const matchingOrder = data?.find(
              (order) => order.orderId === orderId,
            );

            if (
              !matchingOrder ||
              !canGenerateCheckInQr(
                matchingOrder.status,
                matchingOrder.orderType,
              )
            ) {
              delete next[orderId];
            }
          }

          return next;
        });
      }
    } catch (error) {
      console.error(error);
      notify.error("Không tải được đơn của merchant.");
    } finally {
      if (shouldCommit() && !options.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (detailOpen) {
      return;
    }

    let active = true;

    queueMicrotask(() => {
      void loadOrders(() => active);
    });

    const pollId = window.setInterval(() => {
      void loadOrders(() => active, { silent: true });
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [detailOpen]);

  useEffect(() => {
    if (!detailOpen || !selectedOrderId) {
      return;
    }

    let active = true;

    void getMerchantOrderDetail(selectedOrderId)
      .then((data) => {
        if (!active) return;
        setOrderDetail(data as MerchantOrderDetailPayload);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setDetailError("Không tải được chi tiết đơn.");
      })
      .finally(() => {
        if (!active) return;
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detailOpen, selectedOrderId]);

  function openOrderDetail(orderId: string) {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setOrderDetail(null);
    setDetailOpen(true);
  }

  async function handleAcceptOrder(order: MerchantOrderSummary) {
    if (getOrderStatusKey(order.status) !== "pending") {
      notify.error(getLockedOrderMessage(order.status));
      return;
    }

    const { orderId } = order;
    setActionOrderId(orderId);

    try {
      await acceptOrder(orderId);
      notify.success("Đã chấp nhận đơn.");
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.error("Chấp nhận đơn thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleRejectOrder(order: MerchantOrderSummary) {
    if (getOrderStatusKey(order.status) !== "pending") {
      notify.error(getLockedOrderMessage(order.status));
      return;
    }

    const reason = window.prompt("Lý do từ chối đơn hàng")?.trim();

    if (!reason) {
      return;
    }

    const { orderId } = order;
    setActionOrderId(orderId);

    try {
      await rejectOrder(orderId, reason);
      notify.success("Đã từ chối đơn.");
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.error("Từ chối đơn thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleAdvanceOrder(order: MerchantOrderSummary) {
    const action = getMerchantOrderAction(order.status, order.orderType);

    if (!action) {
      notify.error("Đơn hiện không có bước vận hành tiếp theo dành cho quán.");
      return;
    }

    setActionOrderId(order.orderId);

    try {
      await updateMerchantOrderStatus(order.orderId, action.nextStatus);
      notify.success(action.successMessage);
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.error("Không thể cập nhật tiến độ đơn. Vui lòng thử lại.");
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleGenerateQr(
    orderId: string,
    billAlreadyConfirmed = false,
  ) {
    if (generatingQrRef.current.has(orderId) || qrUrls[orderId]) {
      return;
    }

    generatingQrRef.current.add(orderId);
    setActionOrderId(orderId);

    try {
      const nextUrl = await getMerchantCheckInQr(orderId, billAlreadyConfirmed);
      setQrUrls((current) => ({
        ...current,
        [orderId]: nextUrl,
      }));
    } catch (error) {
      console.error(error);
      notify.error("Không tạo được QR check-in.");
    } finally {
      generatingQrRef.current.delete(orderId);
      setActionOrderId(null);
    }
  }

  async function handleUpdateBill(order: MerchantOrderSummary) {
    if (getOrderStatusKey(order.status) !== "billrejected") {
      notify.error("Chỉ có thể cập nhật hóa đơn sau khi khách từ chối bill.");
      return;
    }

    const discountInput = window.prompt(
      "Nhập giá trị giảm giá (số, ví dụ 0 hoặc 10000):",
      "0",
    );

    if (discountInput == null) return; // user cancelled

    const discount = Number(discountInput.trim() || "0");

    if (Number.isNaN(discount)) {
      notify.error("Giá trị giảm giá không hợp lệ.");
      return;
    }

    // Ask whether user wants to adjust items as well
    const editItems = window.confirm(
      "Bạn có muốn chỉnh sửa các món trong hóa đơn không? (OK = có)",
    );

    let items:
      | { foodId: string; quantity?: number; unitPrice?: number }[]
      | undefined = undefined;

    if (editItems) {
      const example =
        "foodId,quantity,unitPrice\n...\nVí dụ: 3fae-...-id,2,50000";
      const raw = window.prompt(
        `Nhập các dòng item theo định dạng: foodId,quantity,unitPrice (mỗi dòng một item). Bỏ trống để không thay đổi.\n\n${example}`,
        "",
      );

      if (raw == null) {
        // user cancelled
        setActionOrderId(null);
        return;
      }

      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length > 0) {
        const parsed: {
          foodId: string;
          quantity?: number;
          unitPrice?: number;
        }[] = [];

        for (const line of lines) {
          const parts = line.split(",").map((p) => p.trim());
          if (parts.length < 1) {
            notify.error(`Dòng không hợp lệ: ${line}`);
            return;
          }

          const foodId = parts[0];
          const quantity = parts[1] ? Number(parts[1]) : undefined;
          const unitPrice = parts[2] ? Number(parts[2]) : undefined;

          if (!foodId) {
            notify.error(`foodId trống trong dòng: ${line}`);
            return;
          }

          if (quantity !== undefined && Number.isNaN(quantity)) {
            notify.error(`quantity không hợp lệ trong dòng: ${line}`);
            return;
          }

          if (unitPrice !== undefined && Number.isNaN(unitPrice)) {
            notify.error(`unitPrice không hợp lệ trong dòng: ${line}`);
            return;
          }

          parsed.push({ foodId, quantity, unitPrice });
        }

        items = parsed;
      }
    }

    setActionOrderId(order.orderId);

    try {
      await updateBill(order.orderId, {
        discount,
        ...(items ? { items } : {}),
      });
      notify.success("Đã cập nhật hóa đơn.");
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.error("Cập nhật hóa đơn thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleConfirmCashPayment(order: MerchantOrderSummary) {
    const orderStatus = getOrderStatusKey(order.status);
    const paymentMethod = order.paymentMethod?.trim().toLowerCase();

    if (orderStatus !== "cashpending" || paymentMethod !== "cash") {
      notify.error(
        "Chỉ có thể xác nhận thanh toán cho đơn tiền mặt đang chờ xác nhận.",
      );
      return;
    }

    setActionOrderId(order.orderId);

    try {
      await confirmCashPayment(order.orderId);
      notify.success("Đã xác nhận thanh toán tiền mặt.");
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.error("Xác nhận thanh toán thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  function getItemName(item: MerchantOrderDetailItem) {
    return item.name ?? "Món ăn";
  }

  function getItemQuantity(item: MerchantOrderDetailItem) {
    return item.quantity ?? 0;
  }

  function getItemUnitPrice(item: MerchantOrderDetailItem) {
    return toCurrencyNumber(item.unitPrice);
  }

  function getItemDisplayUnitPrice(item: MerchantOrderDetailItem) {
    const quantity = getItemQuantity(item);
    const subTotal = getItemSubTotal(item);
    const toppingUnitTotal = getItemToppingUnitTotal(item);
    const toppingTotal = toppingUnitTotal * (quantity > 0 ? quantity : 1);
    const unitPrice = getItemUnitPrice(item);

    if (subTotal > 0 && quantity > 0 && toppingTotal > 0) {
      const baseTotal = subTotal - toppingTotal;
      const totalFromUnit = unitPrice > 0 ? unitPrice * quantity : 0;

      if (baseTotal > 0 && (totalFromUnit <= 0 || totalFromUnit >= subTotal)) {
        return baseTotal / quantity;
      }
    }

    if (unitPrice > toppingUnitTotal && toppingUnitTotal > 0) {
      return unitPrice - toppingUnitTotal;
    }

    if (subTotal > 0 && quantity > 0 && unitPrice <= 0) {
      return subTotal / quantity;
    }

    return unitPrice;
  }

  function getItemToppingUnitTotal(item: MerchantOrderDetailItem) {
    return getItemToppings(item).reduce((sum, topping) => {
      return sum + toCurrencyNumber(topping.price);
    }, 0);
  }

  function getItemToppingTotal(item: MerchantOrderDetailItem) {
    const quantity = getItemQuantity(item);
    const perUnit = getItemToppingUnitTotal(item);

    return quantity > 0 ? perUnit * quantity : perUnit;
  }

  function getItemNote(item: MerchantOrderDetailItem) {
    return item.notes ?? "";
  }

  function getItemToppings(item: MerchantOrderDetailItem) {
    return item.toppings ?? [];
  }

  function getItemSubTotal(item: MerchantOrderDetailItem) {
    return toCurrencyNumber(item.lineTotal);
  }

  function getItemDisplayTotal(item: MerchantOrderDetailItem) {
    const subTotal = getItemSubTotal(item);
    if (subTotal > 0) return subTotal;

    const quantity = getItemQuantity(item);
    const unitPrice = getItemUnitPrice(item);
    return quantity > 0 ? unitPrice * quantity : unitPrice;
  }

  function getDetailTotal() {
    if (!selectedOrder) {
      return 0;
    }

    return orderDetail?.finalPrice ?? selectedOrder.finalPrice;
  }

  const detailItems = getDetailItems(orderDetail);
  const detailTotal = getDetailTotal();

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Order Management
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Đơn hàng của quán
              </h1>
              <p className="mt-3 text-[14px] font-medium text-slate-500 leading-relaxed">
                Theo dõi, duyệt đơn và tạo QR xác nhận bill cho khách hàng.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-5 text-[13px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-center font-medium text-slate-500 p-8">
              Đang tải đơn hàng...
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                return (
                  <div
                    key={order.orderId}
                    className="group relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)] hover:border-white/80"
                  >
                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-multiply" />

                    <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-[19px] font-black tracking-tight text-slate-900 group-hover:text-cyan-800 transition-colors">
                            Đơn #{order.orderId}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${getOrderTypeChipClass(
                              order.orderType,
                            )}`}
                          >
                            {getOrderTypeLabel(order.orderType)}
                          </span>
                        </div>
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/60 bg-gradient-to-r from-cyan-50/90 to-blue-50/90 px-3.5 py-1 text-[13px] font-black text-cyan-800 shadow-sm">
                          Trạng thái: {getOrderStatusLabel(order.status)}
                        </p>
                        <p className="mt-2.5 text-[14px] font-medium text-slate-600">
                          <span className="font-bold text-slate-700">
                            Khách:
                          </span>{" "}
                          {order.customerName || "N/A"}
                        </p>
                        {order.createdAt ? (
                          <p className="mt-1 text-[12px] font-bold text-slate-400">
                            {formatDateTime(order.createdAt)}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 sm:text-right pt-2 sm:pt-0">
                        <p className="text-[22px] font-black text-cyan-700">
                          {order.finalPrice.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200/50 pt-5">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order.orderId)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/70 border border-cyan-200/60 px-5 py-2.5 text-[13px] font-black text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md"
                      >
                        <Eye size={16} />
                        Xem chi tiết
                      </button>

                      <span className="rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-2.5 text-[13px] font-bold text-slate-600 shadow-sm backdrop-blur">
                        {getOrderActionMessage(order.status, order.orderType)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/40 p-12 text-center shadow-sm backdrop-blur">
                  <p className="text-[15px] font-bold text-slate-500">
                    Chưa có đơn nào.
                  </p>
                </div>
              )}
            </div>
          )}

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent
              className="max-h-[92vh] max-w-4xl overflow-hidden border-white/80 bg-slate-50/95 p-0 shadow-2xl shadow-slate-950/25 backdrop-blur-xl"
              onInteractOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <DialogHeader className="border-b border-cyan-100 bg-white/90 px-6 py-5 text-left">
                <DialogTitle>Chi tiết đơn hàng</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 text-slate-500">
                  Xem món ăn, ghi chú, giá tiền và thao tác duyệt đơn ở đây.
                </DialogDescription>
              </DialogHeader>

              {selectedOrder ? (
                <div className="max-h-[calc(92vh-104px)] space-y-5 overflow-y-auto px-6 py-5">
                  <div className="grid gap-3 rounded-3xl border border-white/80 bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-950/5 sm:grid-cols-2">
                    <div>
                      <div className="text-slate-500">Mã đơn</div>
                      <div className="break-all font-mono text-xs font-bold text-slate-900">
                        {selectedOrder.orderId}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Trạng thái</div>
                      <div
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getOrderStatusChipClass(
                          selectedOrder.status,
                        )}`}
                      >
                        {getOrderStatusLabel(selectedOrder.status)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Loại đơn</div>
                      <div
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getOrderTypeChipClass(
                          selectedOrder.orderType,
                        )}`}
                      >
                        {getOrderTypeLabel(selectedOrder.orderType)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Khách</div>
                      <div className="font-semibold text-slate-900">
                        {selectedOrder.customerName || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Thời gian đặt</div>
                      <div className="font-semibold text-slate-900">
                        {formatDateTime(selectedOrder.createdAt)}
                      </div>
                    </div>
                  </div>

                  {detailLoading ? (
                    <p>Đang tải chi tiết đơn...</p>
                  ) : detailError ? (
                    <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-rose-700">
                      {detailError}
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-950">
                        Món đã gọi
                      </h3>
                      <div className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-black text-cyan-700 ring-1 ring-cyan-100">
                        Tổng: {formatCurrency(getDetailTotal())}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {detailItems.map((item, index) => (
                        <div
                          key={`${getItemName(item)}-${index}`}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="font-black text-slate-950">
                                {getItemName(item)}
                              </div>
                              <div className="mt-1 inline-flex rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
                                Số lượng: {getItemQuantity(item)}
                              </div>
                              {getItemToppings(item).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {getItemToppings(item).map((topping) => (
                                    <span
                                      key={topping.id ?? topping.name}
                                      className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                    >
                                      +{topping.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {getItemNote(item) ? (
                                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
                                  Ghi chú: {getItemNote(item)}
                                </div>
                              ) : null}
                            </div>

                            <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-right text-sm shadow-sm ring-1 ring-slate-100">
                              <div className="font-medium text-slate-700">
                                Đơn giá:{" "}
                                {formatCurrency(getItemDisplayUnitPrice(item))}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                SL: {getItemQuantity(item)}
                              </div>
                              {getItemToppingTotal(item) > 0 ? (
                                <div className="mt-1 text-xs font-semibold text-emerald-700">
                                  Topping: +
                                  {formatCurrency(getItemToppingTotal(item))}
                                </div>
                              ) : null}
                              <div className="mt-1 font-black text-cyan-700">
                                Thành tiền:{" "}
                                {formatCurrency(getItemDisplayTotal(item))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {!detailLoading && detailItems.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Chưa có dữ liệu món ăn.
                        </p>
                      ) : null}
                    </div>

                    {getDetailNote(orderDetail) ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="font-semibold">Ghi chú của khách</div>
                        <div className="mt-1">{getDetailNote(orderDetail)}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-cyan-100 bg-cyan-50/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">Tổng tiền</div>
                      <div className="text-2xl font-black text-cyan-700">
                        {formatCurrency(detailTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 shadow-sm ring-1 ring-cyan-50">
                    {getOrderActionMessage(
                      selectedOrder.status,
                      selectedOrder.orderType,
                    )}
                  </div>

                  <DialogFooter className="border-t border-slate-100 pt-4 gap-3 sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {getOrderStatusKey(selectedOrder.status) === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void handleAcceptOrder(selectedOrder)
                            }
                            disabled={actionOrderId === selectedOrder.orderId}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check size={16} />
                            Xác nhận đơn
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleRejectOrder(selectedOrder)
                            }
                            disabled={actionOrderId === selectedOrder.orderId}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:-translate-y-px hover:bg-rose-50 disabled:opacity-50"
                          >
                            <X size={16} />
                            Từ chối đơn
                          </button>
                        </>
                      ) : null}

                      {getMerchantOrderAction(
                        selectedOrder.status,
                        selectedOrder.orderType,
                      ) ? (
                        <button
                          type="button"
                          onClick={() => void handleAdvanceOrder(selectedOrder)}
                          disabled={actionOrderId === selectedOrder.orderId}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {getOrderStatusKey(selectedOrder.status) ===
                          "accepted" ? (
                            <ChefHat size={17} />
                          ) : getOrderStatusKey(selectedOrder.status) ===
                            "preparing" ? (
                            <PackageCheck size={17} />
                          ) : (
                            <Bike size={17} />
                          )}
                          {
                            getMerchantOrderAction(
                              selectedOrder.status,
                              selectedOrder.orderType,
                            )?.label
                          }
                        </button>
                      ) : null}

                      {getOrderStatusKey(selectedOrder.status) ===
                      "billrejected" ? (
                        <button
                          type="button"
                          onClick={() => void handleUpdateBill(selectedOrder)}
                          disabled={actionOrderId === selectedOrder.orderId}
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:-translate-y-px hover:bg-amber-50 disabled:opacity-50"
                        >
                          Cập nhật hóa đơn
                        </button>
                      ) : null}

                      {canGenerateCheckInQr(
                        selectedOrder.status,
                        selectedOrder.orderType,
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleGenerateQr(
                              selectedOrder.orderId,
                              getOrderStatusKey(selectedOrder.status) ===
                                "billconfirmed",
                            )
                          }
                          disabled={
                            actionOrderId === selectedOrder.orderId ||
                            Boolean(qrUrls[selectedOrder.orderId])
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:-translate-y-px hover:bg-cyan-50 disabled:opacity-50"
                        >
                          <QrCode size={16} />
                          {qrUrls[selectedOrder.orderId]
                            ? "Đã tạo QR"
                            : "Tạo mã QR check-in"}
                        </button>
                      ) : null}

                      {getOrderStatusKey(selectedOrder.status) ===
                        "cashpending" &&
                      selectedOrder.paymentMethod?.trim().toLowerCase() ===
                        "cash" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleConfirmCashPayment(selectedOrder)
                          }
                          disabled={actionOrderId === selectedOrder.orderId}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check size={16} />
                          Xác nhận thanh toán tiền mặt
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
                    >
                      Đóng
                    </button>
                  </DialogFooter>

                  {qrUrls[selectedOrder.orderId] ? (
                    <div className="mx-auto inline-flex rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
                      <img
                        src={qrUrls[selectedOrder.orderId]}
                        alt={`QR check-in ${selectedOrder.orderId}`}
                        className="h-40 w-40 object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </main>
  );
}
