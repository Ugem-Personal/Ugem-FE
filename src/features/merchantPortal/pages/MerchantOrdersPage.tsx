import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Check,
  ChefHat,
  Eye,
  Map,
  MapPin,
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
import VietMapGL from "@/shared/components/VietMapGL";

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

function getShortOrderCode(orderId: string) {
  return orderId.split("-")[0]?.toUpperCase() || orderId;
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
  paymentStatus?: string | null,
) {
  const isPaid = paymentStatus?.trim().toLowerCase() === "paid";
  const statusKey = getOrderStatusKey(status);

  if (isPaid || statusKey === "completed") {
    return false;
  }

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
  paymentStatus?: string | null,
) {
  const isPaid = paymentStatus?.trim().toLowerCase() === "paid";
  const statusKey = getOrderStatusKey(status);

  if (isPaid || statusKey === "completed") {
    return orderType?.trim().toLowerCase() === "offline"
      ? "Đơn offline đã hoàn tất, đã xác nhận thanh toán."
      : "Đơn online đã hoàn tất.";
  }

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

function canConfirmPayment(
  status?: string | null,
  paymentStatus?: string | null,
  billStatus?: string | null,
) {
  const isPaid = paymentStatus?.trim().toLowerCase() === "paid";
  if (isPaid) return false;

  const statusKey = getOrderStatusKey(status);
  const isBillConfirmed = billStatus?.trim().toLowerCase() === "confirmed";

  // Quán thấy nút "Xác nhận đã nhận tiền" SAU KHI khách hàng đã bấm "Xác nhận hóa đơn" (billConfirmed hoặc status billconfirmed / cashpending)
  return (
    isBillConfirmed ||
    statusKey === "billconfirmed" ||
    statusKey === "cashpending"
  );
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

const QUICK_REJECT_REASONS = [
  "Đơn không hợp lệ",
  "Hết món / Hết nguyên liệu",
  "Quán đang quá tải",
  "Không thể giao tới địa chỉ này",
];

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<MerchantOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deliveryMapOpen, setDeliveryMapOpen] = useState(false);
  const [orderDetail, setOrderDetail] =
    useState<MerchantOrderDetailPayload | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const generatingQrRef = useRef(new Set<string>());

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetOrder, setRejectTargetOrder] =
    useState<MerchantOrderSummary | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    setDeliveryMapOpen(false);
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
      notify.errorApi(error, "Chấp nhận đơn thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  function handleRejectOrder(order: MerchantOrderSummary) {
    if (getOrderStatusKey(order.status) !== "pending") {
      notify.error(getLockedOrderMessage(order.status));
      return;
    }

    setRejectTargetOrder(order);
    setRejectReason("Đơn không hợp lệ");
    setRejectDialogOpen(true);
  }

  async function confirmRejectOrder() {
    if (!rejectTargetOrder || !rejectReason.trim()) return;

    const { orderId } = rejectTargetOrder;
    setActionOrderId(orderId);

    try {
      await rejectOrder(orderId, rejectReason.trim());
      notify.success("Đã từ chối đơn hàng thành công.");
      setRejectDialogOpen(false);
      setRejectTargetOrder(null);
      if (detailOpen) setDetailOpen(false);
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.errorApi(error, "Từ chối đơn thất bại.");
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
      notify.errorApi(error, "Không thể cập nhật tiến độ đơn. Vui lòng thử lại.");
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
      notify.errorApi(error, "Không tạo được QR check-in.");
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
      notify.errorApi(error, "Cập nhật hóa đơn thất bại.");
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleConfirmCashPayment(order: MerchantOrderSummary) {
    if (order.paymentStatus?.toLowerCase() === "paid") {
      notify.error("Đơn hàng này đã được thanh toán.");
      return;
    }

    setActionOrderId(order.orderId);

    try {
      await confirmCashPayment(order.orderId);
      notify.success("Đã xác nhận thanh toán và hoàn tất đơn hàng!");
      await loadOrders();
    } catch (error) {
      console.error(error);
      notify.errorApi(error, "Xác nhận thanh toán thất bại.");
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
    <main className="merchant-portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                Order Management
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Đơn hàng của quán
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Theo dõi, duyệt đơn và tạo QR xác nhận bill cho khách hàng.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md transition disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>

          {loading ? (
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 p-8">
              Đang tải đơn hàng...
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                return (
                  <div
                    key={order.orderId}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300"
                  >
                    <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p
                            title={order.orderId}
                            className="text-lg font-black tracking-tight text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                          >
                            Đơn #{getShortOrderCode(order.orderId)}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getOrderTypeChipClass(
                              order.orderType,
                            )}`}
                          >
                            {getOrderTypeLabel(order.orderType)}
                          </span>
                        </div>
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          Trạng thái: {getOrderStatusLabel(order.status)}
                        </p>
                        <p className="mt-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Khách:
                          </span>{" "}
                          {order.customerName || "N/A"}
                        </p>
                        {order.createdAt ? (
                          <p className="mt-1 text-xs font-mono text-slate-400 dark:text-slate-500">
                            {formatDateTime(order.createdAt)}
                          </p>
                        ) : null}
                        {order.orderType?.toLowerCase() === "online" &&
                        order.deliveryAddress ? (
                          <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                            <span>{order.deliveryAddress}</span>
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 sm:text-right pt-2 sm:pt-0">
                        <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
                          {order.finalPrice.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-white/5 pt-5">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order.orderId)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 shadow-xs transition"
                      >
                        <Eye size={16} />
                        Xem chi tiết
                      </button>

                      {canGenerateCheckInQr(
                        order.status,
                        order.orderType,
                        order.paymentStatus,
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleGenerateQr(
                              order.orderId,
                              getOrderStatusKey(order.status) ===
                                "billconfirmed",
                            )
                          }
                          disabled={
                            actionOrderId === order.orderId ||
                            Boolean(qrUrls[order.orderId])
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-50"
                        >
                          <QrCode size={16} />
                          {qrUrls[order.orderId]
                            ? "Đã tạo QR"
                            : "Tạo mã QR check-in"}
                        </button>
                      ) : null}

                      {canConfirmPayment(
                        order.status,
                        order.paymentStatus,
                        (order as any).bill?.status,
                      ) ? (
                        <button
                          type="button"
                          onClick={() => void handleConfirmCashPayment(order)}
                          disabled={actionOrderId === order.orderId}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Check size={16} />
                          Xác nhận đã nhận tiền
                        </button>
                      ) : null}

                      <span className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {getOrderActionMessage(order.status, order.orderType, order.paymentStatus)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-12 text-center shadow-xl backdrop-blur-2xl">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Chưa có đơn hàng nào.
                  </p>
                </div>
              )}
            </div>
          )}

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent
              className="!top-2 !bottom-2 flex !h-auto !max-h-none max-w-4xl !translate-y-0 flex-col gap-0 overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-0 shadow-2xl backdrop-blur-2xl [animation:none] sm:!top-6 sm:!bottom-6"
              onInteractOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <DialogHeader className="shrink-0 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 px-6 py-5 text-left">
                <DialogTitle className="text-lg font-black text-slate-950 dark:text-white">Chi tiết đơn hàng</DialogTitle>
                <DialogDescription className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Xem món ăn, ghi chú, giá tiền và thao tác duyệt đơn ở đây.
                </DialogDescription>
              </DialogHeader>

              {selectedOrder ? (
                <div className="min-h-0 flex-1 touch-pan-y space-y-5 overflow-y-auto overscroll-contain px-6 py-5 pb-32 [scrollbar-gutter:stable]">
                  <div className="grid gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">Mã đơn</div>
                      <div className="break-all font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedOrder.orderId}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">Trạng thái</div>
                      <div
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${getOrderStatusChipClass(
                          selectedOrder.status,
                        )}`}
                      >
                        {getOrderStatusLabel(selectedOrder.status)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">Loại đơn</div>
                      <div
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${getOrderTypeChipClass(
                          selectedOrder.orderType,
                        )}`}
                      >
                        {getOrderTypeLabel(selectedOrder.orderType)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">Khách hàng</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedOrder.customerName || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">Thời gian đặt</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatDateTime(selectedOrder.createdAt)}
                      </div>
                    </div>
                    {selectedOrder.orderType?.toLowerCase() === "online" ? (
                      <div className="sm:col-span-2">
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                          Điểm giao hàng
                        </div>
                        <div className="mt-1 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-500/25 dark:bg-cyan-500/10">
                          <span className="flex min-w-0 items-start gap-2 font-bold text-slate-900 dark:text-white">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                            {selectedOrder.deliveryAddress || "Chưa có địa chỉ giao hàng"}
                          </span>
                          {Number.isFinite(selectedOrder.deliveryLatitude) &&
                          Number.isFinite(selectedOrder.deliveryLongitude) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDeliveryMapOpen((current) => !current)
                              }
                              aria-expanded={deliveryMapOpen}
                              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-3 text-xs font-black text-white transition hover:bg-cyan-500"
                            >
                              <Map className="h-4 w-4" />
                              {deliveryMapOpen
                                ? "Ẩn VietMap"
                                : "Xem trên VietMap"}
                            </button>
                          ) : null}
                        </div>
                        {deliveryMapOpen &&
                        Number.isFinite(selectedOrder.deliveryLatitude) &&
                        Number.isFinite(selectedOrder.deliveryLongitude) ? (
                          <div className="mt-3 h-72 overflow-hidden rounded-xl border border-cyan-200 dark:border-cyan-500/25">
                            <VietMapGL
                              centerLat={Number(
                                selectedOrder.deliveryLatitude,
                              )}
                              centerLng={Number(
                                selectedOrder.deliveryLongitude,
                              )}
                              zoom={17}
                              markers={[
                                {
                                  id: "delivery-location",
                                  lat: Number(selectedOrder.deliveryLatitude),
                                  lng: Number(selectedOrder.deliveryLongitude),
                                  type: "user",
                                },
                              ]}
                              selectedMarkerId="delivery-location"
                              fitToMarkers
                              className="h-full w-full"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {detailLoading ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải chi tiết đơn...</p>
                  ) : detailError ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                      {detailError}
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Món đã gọi
                      </h3>
                      <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        Tổng: {formatCurrency(getDetailTotal())}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {detailItems.map((item, index) => (
                        <div
                          key={`${getItemName(item)}-${index}`}
                          className="rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-slate-800/60 p-4 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-slate-950 dark:text-white">
                                {getItemName(item)}
                              </div>
                              <div className="mt-1 inline-flex rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                Số lượng: {getItemQuantity(item)}
                              </div>
                              {getItemToppings(item).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {getItemToppings(item).map((topping) => (
                                    <span
                                      key={topping.id ?? topping.name}
                                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                                    >
                                      +{topping.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {getItemNote(item) ? (
                                <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                                  Ghi chú: {getItemNote(item)}
                                </div>
                              ) : null}
                            </div>

                            <div className="shrink-0 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-2 text-right text-xs">
                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                Đơn giá:{" "}
                                {formatCurrency(getItemDisplayUnitPrice(item))}
                              </div>
                              <div className="mt-0.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                SL: {getItemQuantity(item)}
                              </div>
                              {getItemToppingTotal(item) > 0 ? (
                                <div className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Topping: +
                                  {formatCurrency(getItemToppingTotal(item))}
                                </div>
                              ) : null}
                              <div className="mt-1 font-mono font-black text-cyan-600 dark:text-cyan-400">
                                Thành tiền:{" "}
                                {formatCurrency(getItemDisplayTotal(item))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {!detailLoading && detailItems.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Chưa có dữ liệu món ăn.
                        </p>
                      ) : null}
                    </div>

                    {getDetailNote(orderDetail) ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                        <div className="font-bold">Ghi chú của khách</div>
                        <div className="mt-0.5">{getDetailNote(orderDetail)}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Tổng tiền</div>
                      <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
                        {formatCurrency(detailTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                    {getOrderActionMessage(
                      selectedOrder.status,
                      selectedOrder.orderType,
                      selectedOrder.paymentStatus,
                    )}
                  </div>

                  <DialogFooter className="absolute inset-x-0 bottom-0 z-20 gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {getOrderStatusKey(selectedOrder.status) === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void handleAcceptOrder(selectedOrder)
                            }
                            disabled={actionOrderId === selectedOrder.orderId}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
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
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
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
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 shadow-md transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Cập nhật hóa đơn
                        </button>
                      ) : null}

                      {canGenerateCheckInQr(
                        selectedOrder.status,
                        selectedOrder.orderType,
                        selectedOrder.paymentStatus,
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
                          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-50"
                        >
                          <QrCode size={16} />
                          {qrUrls[selectedOrder.orderId]
                            ? "Đã tạo QR"
                            : "Tạo mã QR check-in"}
                        </button>
                      ) : null}

                      {canConfirmPayment(
                        selectedOrder.status,
                        selectedOrder.paymentStatus,
                        (selectedOrder as any).bill?.status,
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleConfirmCashPayment(selectedOrder)
                          }
                          disabled={actionOrderId === selectedOrder.orderId}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Check size={16} />
                          Xác nhận đã nhận tiền
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailOpen(false)}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-white/20"
                    >
                      Đóng
                    </button>
                  </DialogFooter>

                  {qrUrls[selectedOrder.orderId] ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/40 p-4 shadow-md">
                      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white p-2 shrink-0">
                        <img
                          src={qrUrls[selectedOrder.orderId]}
                          alt={`QR check-in ${selectedOrder.orderId}`}
                          className="h-36 w-36 object-contain"
                        />
                      </div>
                      <div className="flex-1 w-full space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <div className="font-bold text-cyan-600 dark:text-cyan-400 border-b border-cyan-200/50 dark:border-cyan-800/50 pb-1">
                          Thông tin tài khoản ngân hàng của quán:
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 dark:border-white/10 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                          <span className="font-bold">{import.meta.env.VITE_BANK_NAME || "BIDV"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/50 dark:border-white/10 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Số tài khoản (STK):</span>
                          <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                            {import.meta.env.VITE_BANK_ACCOUNT || "5321252810"}
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 italic pt-1">
                          Khách hàng quét mã QR trên điện thoại để xem hóa đơn và tự động điền số tiền + nội dung chuyển khoản.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

          {/* Reject Order Custom Modal */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent className="max-w-md border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-6 rounded-3xl text-slate-900 dark:text-white shadow-2xl backdrop-blur-2xl">
              <DialogHeader className="text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                      Từ chối đơn hàng #{rejectTargetOrder ? getShortOrderCode(rejectTargetOrder.orderId) : ""}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Chọn hoặc nhập lý do từ chối để phản hồi cho khách hàng.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Lý do nhanh
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REJECT_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          rejectReason === preset
                            ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs"
                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Lý do chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-3.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <button
                  type="button"
                  onClick={() => setRejectDialogOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim() || actionOrderId === rejectTargetOrder?.orderId}
                  onClick={() => void confirmRejectOrder()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Xác nhận từ chối
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </main>
  );
}
