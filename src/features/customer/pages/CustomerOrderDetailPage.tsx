import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Star,
  RefreshCw,
  MapPin,
  FileText,
  Clock,
  Receipt,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
import {
  confirmReceived,
  getCustomerOrderDetail,
  getCustomerOrderId,
  getCustomerOrders,
} from "../services/orderService";
import type {
  CustomerOrderDetailItem,
  CustomerOrderSummary,
} from "@/shared/types";
import { notify } from "@/shared/lib/notify";
import {
  getCustomerOrderProgressMessage,
  isCustomerConfirmationReady,
} from "@/shared/lib/order-status";
import {
  createReview,
  getReviewsByMerchantId,
  type Review,
} from "@/features/review/services";
import { findMerchantByFoodId } from "../services/merchantService";
import { ImageWithFallback, ModeToggle } from "@/shared/components";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";

type OrderDetailLocationState = {
  order?: CustomerOrderSummary;
  fallbackOrderNumber?: number;
};



const orderIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getCustomerConfirmMessage(
  status?: string | null,
  orderType?: string | null,
) {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "cashpending") {
    return "Bạn đã thanh toán tiền mặt. Đang chờ Merchant xác nhận để hoàn tất check-in.";
  }

  return getCustomerOrderProgressMessage(status, orderType);
}

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const handleBack = useSafeBack("/customer/orders");
  const navigationState = location.state as OrderDetailLocationState | null;
  const summaryOrder = navigationState?.order ?? null;
  const fallbackOrderNumber = navigationState?.fallbackOrderNumber ?? null;
  const hasRealOrderId = Boolean(id && orderIdPattern.test(id));
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerOrderDetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [, setMerchantName] = useState<string>("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewContent, setReviewContent] = useState<string>("");
  const [foodReviewDrafts, setFoodReviewDrafts] = useState<Record<string, { rating: number; content: string }>>({});
  const [, setActiveFoodReviewId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) return;

      setLoading(true);
      setResolvedOrderId(null);

      try {
        let effectiveOrderId = id;
        let matchingSummaryOrder = summaryOrder;

        if (!hasRealOrderId) {
          const ordersRes = await getCustomerOrders().catch(() => ({ data: [] }));
          const orders = ordersRes.data ?? [];
          const refreshedSummaryOrder = summaryOrder
            ? orders.find((order: CustomerOrderSummary) => matchesSummaryOrder(order, summaryOrder))
            : orders[0];

          matchingSummaryOrder =
            refreshedSummaryOrder ?? summaryOrder ?? matchingSummaryOrder;
          effectiveOrderId = getCustomerOrderId(matchingSummaryOrder) || "";

          if (!effectiveOrderId) {
            if (active) {
              setItems([]);
              setOrderStatus(matchingSummaryOrder?.status ?? null);
              setMerchantId(null);
              setMerchantName(matchingSummaryOrder?.name || "");
            }
            return;
          }

          if (active) {
            setResolvedOrderId(effectiveOrderId);
            navigate(`/customer/orders/${effectiveOrderId}${location.hash}`, {
              replace: true,
              state: {
                order: matchingSummaryOrder ?? summaryOrder ?? undefined,
                fallbackOrderNumber,
              },
            });
          }
        }

        const [data, ordersRes] = await Promise.all([
          getCustomerOrderDetail(effectiveOrderId),
          getCustomerOrders().catch(() => ({ data: [] })),
        ]);
        const orders = ordersRes.data ?? [];

        if (active) {
          setItems(data ?? []);
          setOrderStatus(
            orders.find(
              (order: CustomerOrderSummary) => getCustomerOrderId(order) === effectiveOrderId,
            )?.status ??
              matchingSummaryOrder?.status ??
              null,
          );
        }

        const firstItem = data?.[0];
        const firstFoodId = firstItem?.foodId;

        if (firstFoodId) {
          const merchant = await resolveOrderMerchant(firstItem).catch(
            (error) => {
              console.error(error);
              return null;
            },
          );

          if (active) {
            setMerchantId(merchant?.id ?? null);
            setMerchantName(merchant?.name ?? "");
          }

          if (merchant?.id && effectiveOrderId) {
            const merchantReviews = await getReviewsByMerchantId(
              merchant.id,
            ).catch(() => []);

            if (active) {
              const existingReview = merchantReviews.find((review: Review) => {
                const reviewOrderId = review.orderId;
                return (
                  normalizeReviewOrderId(reviewOrderId) === effectiveOrderId
                );
              });

              setHasReviewed(Boolean(existingReview));
            }
          }
        } else if (active) {
          setMerchantId(null);
          setMerchantName("");
          setHasReviewed(false);
        }
      } catch (error) {
        console.error(error);
        notify.error("Không tải được chi tiết đơn.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [
    fallbackOrderNumber,
    hasRealOrderId,
    id,
    location.hash,
    navigate,
    summaryOrder,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#review-section") return;

    const timer = window.setTimeout(() => {
      document.getElementById("review-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [id]);

  async function handleSubmitReview() {
    const orderId = hasRealOrderId ? id : resolvedOrderId;

    if (!orderId || !merchantId) {
      notify.error("Không xác định được merchant để đánh giá.");
      return;
    }

    if (hasReviewed) {
      notify.error("Đơn hàng này đã được đánh giá rồi.");
      return;
    }

    if (!isCompleted) {
      notify.error("Chỉ có thể đánh giá khi đơn hàng đã hoàn tất.");
      return;
    }

    const reviewDetails = items
      .map((item) => {
        const orderDetailId = getOrderDetailId(item);
        const draft = orderDetailId ? foodReviewDrafts[orderDetailId] : null;

        if (!orderDetailId || !draft || draft.rating < 1) {
          return null;
        }

        return {
          orderDetailId,
          rating: draft.rating,
          content: draft.content.trim(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          orderDetailId: string;
          rating: number;
          content: string;
        } => item !== null,
      );

    setSubmittingReview(true);

    try {
      await createReview({
        merchantId,
        orderId,
        rating: reviewRating,
        content: reviewContent.trim(),
        details: reviewDetails.length > 0 ? reviewDetails : undefined,
      });

      notify.success("Đã gửi đánh giá thành công.");
      setReviewContent("");
      setReviewRating(5);
      setFoodReviewDrafts({});
      setActiveFoodReviewId(null);
      setHasReviewed(true);
    } catch (error) {
      console.error(error);
      notify.error("Gửi đánh giá thất bại.");
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleRefresh() {
    window.location.reload();
  }

  async function handleOpenCheckIn() {
    const orderId = effectiveOrderId;

    if (!orderId) return;

    if (isOfflineOrder) {
      navigate(`/orders/confirm?orderId=${encodeURIComponent(orderId)}`);
      return;
    }

    setConfirmingDelivery(true);

    try {
      await confirmReceived(orderId);
      notify.success("Đã xác nhận nhận hàng và hoàn tất.");
      navigate("/check-in?success=1", { replace: true });
    } catch (error) {
      console.error(error);
      notify.error("Không thể xác nhận nhận hàng. Vui lòng thử lại.");
    } finally {
      setConfirmingDelivery(false);
    }
  }



  const itemsTotal = items.reduce((sum, item) => {
    return sum + Number(item.unitPrice || 0) * Number(item.quantity || 0);
  }, 0);
  const total =
    itemsTotal > 0 ? itemsTotal : Number(summaryOrder?.finalPrice || 0);
  const title = summaryOrder?.name || `Đơn #${fallbackOrderNumber ?? id}`;
  const effectiveOrderId = hasRealOrderId ? id : resolvedOrderId;
  const displayOrderStatus = orderStatus ?? summaryOrder?.status ?? null;
  const normalizedOrderStatus = displayOrderStatus?.trim().toLowerCase();
  const isCompleted = normalizedOrderStatus === "completed";
  const isOfflineOrder =
    summaryOrder?.orderType?.trim().toLowerCase() === "offline" ||
    normalizeString(summaryOrder?.deliveryAddress) === "tai quan" ||
    normalizeString(summaryOrder?.notes).includes("offline");
  const isConfirmationReady = isCustomerConfirmationReady(
    displayOrderStatus,
    isOfflineOrder ? "Offline" : "Online",
  );
  const reviewLocked = hasReviewed || submittingReview;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 p-5 text-slate-500 dark:text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent" />
        <p className="text-xs font-extrabold">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-950 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-4xl space-y-6">
        {/* Navbar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
            <ModeToggle />
          </div>
        </div>

        {/* Order Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                  <Receipt className="h-3.5 w-3.5" /> Order Detail
                </span>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {isOfflineOrder ? "Tại quán" : "Giao hàng"}
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>

              {summaryOrder && (
                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(summaryOrder.orderedAt).toLocaleString("vi-VN")}
                  {effectiveOrderId && (
                    <span className="font-mono">#{effectiveOrderId.slice(0, 8)}</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <OrderStatusBadge status={displayOrderStatus} />
              <p className="text-2xl font-black tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                {formatPrice(total)}
              </p>
            </div>
          </div>

          {/* Delivery & Notes Info */}
          {summaryOrder && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              {summaryOrder.deliveryAddress && !isOfflineOrder && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-950/50 p-3.5">
                  <MapPin className="h-4 w-4 shrink-0 text-cyan-500 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Địa chỉ giao hàng</p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">{summaryOrder.deliveryAddress}</p>
                  </div>
                </div>
              )}

              {summaryOrder.notes && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/50 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/40 p-3.5 text-amber-900 dark:text-amber-200">
                  <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-bold">Ghi chú của đơn</p>
                    <p className="mt-0.5">{summaryOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ready / Confirmation Action Box */}
          {effectiveOrderId && isConfirmationReady ? (
            <div className="mt-6 rounded-2xl border border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/60 dark:to-slate-900 px-5 py-4 shadow-2xs">
              <div className="font-black text-slate-950 dark:text-white text-sm">
                {isOfflineOrder ? "Món đã sẵn sàng tại bàn" : "Đơn đang được giao tới bạn"}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {isOfflineOrder
                  ? "Vui lòng mở hóa đơn kiểm tra và hoàn tất xác nhận check-in."
                  : "Chỉ bấm xác nhận sau khi bạn đã kiểm tra và nhận đầy đủ món."}
              </p>
              <button
                type="button"
                onClick={() => void handleOpenCheckIn()}
                disabled={confirmingDelivery}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-cyan-500 px-5 py-2.5 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition"
              >
                <Check className="h-4 w-4" />
                {isOfflineOrder ? "Xác nhận bill" : "Đã nhận hàng"}
              </button>
            </div>
          ) : effectiveOrderId ? (
            <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/40 px-5 py-4 text-xs font-bold text-amber-900 dark:text-amber-200">
              {getCustomerConfirmMessage(
                displayOrderStatus,
                isOfflineOrder ? "Offline" : "Online",
              )}
            </div>
          ) : null}
        </div>

        {/* Order Status Timeline Stepper */}
        <OrderStatusTimeline
          status={displayOrderStatus}
          orderType={isOfflineOrder ? "Offline" : "Online"}
          orderedAt={summaryOrder?.orderedAt}
        />

        {/* Ordered Food Items List */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs backdrop-blur-2xl">
          <h2 className="mb-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Danh sách món đã đặt ({items.length})
          </h2>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.foodId || idx}
                className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 p-4 shadow-xs"
              >
                <div className="flex items-center gap-4 min-w-0 pr-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name || "Món ăn"}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950 dark:text-white">
                      {item.name || "Món ăn"}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Số lượng: <span className="font-black text-slate-800 dark:text-slate-200">{item.quantity}</span>
                    </p>
                    {item.toppings && item.toppings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.toppings.map((topping) => (
                          <span
                            key={topping.foodToppingId || topping.name}
                            className="rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300"
                          >
                            +{topping.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md w-fit border border-amber-200/50 dark:border-amber-700/40">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <p className="shrink-0 text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {formatPrice(Number(item.unitPrice || 0) * Number(item.quantity || 1))}
                </p>
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center py-8">
                {effectiveOrderId
                  ? "Không có dữ liệu món trong đơn."
                  : "Đang tải dữ liệu thực đơn..."}
              </p>
            )}
          </div>
        </div>

        {/* Customer Review Section (Active when order Completed) */}
        <div
          id="review-section"
          className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs backdrop-blur-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Customer Rating
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Đánh giá chất lượng quán
              </h2>
            </div>

            <OrderStatusBadge status={displayOrderStatus} />
          </div>

          {!effectiveOrderId ? (
            <p className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Đang tải mã đơn thực tế để gửi đánh giá.
            </p>
          ) : !isCompleted ? (
            <p className="rounded-2xl border border-dashed border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 text-xs font-bold text-amber-800 dark:text-amber-300">
              Bạn có thể gửi đánh giá sau khi đơn hàng đã hoàn tất thành công.
            </p>
          ) : hasReviewed ? (
            <p className="rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Đơn hàng này đã được gửi đánh giá. Cảm ơn phản hồi của bạn!
            </p>
          ) : merchantId ? (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Chọn số sao đánh giá
                </p>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const active = value <= reviewRating;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value)}
                        disabled={reviewLocked}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                          active
                            ? "border-amber-400 bg-amber-50 text-amber-500 dark:bg-amber-950/80"
                            : "border-slate-200 dark:border-white/10 text-slate-300 dark:text-slate-700"
                        }`}
                      >
                        <Star
                          className={`h-5 w-5 ${active ? "fill-amber-400" : ""}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-content"
                  className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                >
                  Nội dung nhận xét (Không bắt buộc)
                </label>
                <textarea
                  id="review-content"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn về món ăn & dịch vụ..."
                  disabled={reviewLocked}
                  className="min-h-28 w-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/50 p-4 text-xs font-medium outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleSubmitReview()}
                disabled={reviewLocked}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-6 py-3 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition disabled:opacity-50"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {hasReviewed
                  ? "Đã đánh giá"
                  : submittingReview
                    ? "Đang gửi..."
                    : "Gửi đánh giá"}
              </button>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Không lấy được thông tin quán từ đơn hàng này.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeReviewOrderId(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getOrderDetailId(item: CustomerOrderDetailItem) {
  return item.orderDetailId;
}

function matchesSummaryOrder(
  candidate: CustomerOrderSummary,
  reference: CustomerOrderSummary | null,
) {
  if (!reference) return true;

  return (
    normalizeString(candidate.name) === normalizeString(reference.name) &&
    normalizeString(candidate.status) === normalizeString(reference.status) &&
    normalizeString(candidate.deliveryAddress) ===
      normalizeString(reference.deliveryAddress) &&
    normalizeString(candidate.notes) === normalizeString(reference.notes) &&
    normalizeDateString(candidate.orderedAt) ===
      normalizeDateString(reference.orderedAt) &&
    normalizeNumber(candidate.finalPrice) ===
      normalizeNumber(reference.finalPrice)
  );
}

function normalizeString(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeNumber(value?: number | null) {
  return Number(value ?? 0).toFixed(2);
}

function normalizeDateString(value?: string | null) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}

async function resolveOrderMerchant(item?: CustomerOrderDetailItem | null) {
  if (!item?.foodId) return null;

  if (item.merchantId) {
    return {
      id: item.merchantId,
      name: item.merchantName || "",
    };
  }

  const merchant = await findMerchantByFoodId(item.foodId);
  if (!merchant?.id) return null;

  return {
    id: merchant.id,
    name: merchant.name || item.merchantName || "",
  };
}
