import { useEffect, useState } from "react";
import { Check, Star } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  createReview,
  getReviewsByMerchantId,
  type Review,
} from "@/features/review/services";
import { findMerchantByFoodId } from "../services/merchantService";

type OrderDetailLocationState = {
  order?: CustomerOrderSummary;
  fallbackOrderNumber?: number;
};

type FoodReviewDraft = {
  rating: number;
  content: string;
};

const orderIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getCustomerConfirmMessage(status?: string | null) {
  const normalizedStatus = status?.toLowerCase();

  if (!normalizedStatus || normalizedStatus === "pending") {
    return "Đơn đang chờ Merchant xác nhận. Sau khi quán chấp nhận đơn, bạn mới có thể xác nhận nhận hàng.";
  }

  if (normalizedStatus === "rejected") {
    return "Đơn đã bị Merchant từ chối nên không thể xác nhận nhận hàng.";
  }

  if (normalizedStatus === "completed") {
    return "Bạn đã xác nhận nhận hàng cho đơn này.";
  }

  if (normalizedStatus === "cashpending") {
    return "Bạn đã thanh toán tiền mặt. Đang chờ Merchant xác nhận để hoàn tất check-in.";
  }

  if (normalizedStatus === "notreceived") {
    return "Bạn đã báo chưa nhận hàng cho đơn này.";
  }

  if (normalizedStatus === "accepted") {
    return "Đơn đã được Merchant xác nhận và đang giao. Khi nhận được hàng, bấm xác nhận để hoàn tất check-in.";
  }

  return "Bạn chỉ có thể xác nhận đơn sau khi Merchant chấp nhận đơn hàng.";
}

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as OrderDetailLocationState | null;
  const summaryOrder = navigationState?.order ?? null;
  const fallbackOrderNumber = navigationState?.fallbackOrderNumber ?? null;
  const hasRealOrderId = Boolean(id && orderIdPattern.test(id));
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerOrderDetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [foodReviewDrafts, setFoodReviewDrafts] = useState<
    Record<string, FoodReviewDraft>
  >({});
  const [activeFoodReviewId, setActiveFoodReviewId] = useState<string | null>(
    null,
  );
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

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
          const orders = await getCustomerOrders().catch(() => []);
          const refreshedSummaryOrder = summaryOrder
            ? orders.find((order) => matchesSummaryOrder(order, summaryOrder))
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

        const [data, orders] = await Promise.all([
          getCustomerOrderDetail(effectiveOrderId),
          getCustomerOrders().catch(() => []),
        ]);

        if (active) {
          setItems(data ?? []);
          setOrderStatus(
            orders.find(
              (order) => getCustomerOrderId(order) === effectiveOrderId,
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
          detailContent: draft.content.trim(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          orderDetailId: string;
          rating: number;
          detailContent: string;
        } => item !== null,
      );

    setSubmittingReview(true);

    try {
      await createReview({
        merchantId,
        orderId,
        rating: reviewRating,
        content: reviewContent.trim(),
        reviewDetails: reviewDetails.length > 0 ? reviewDetails : undefined,
      });

      notify.success("Đã gửi đánh giá.");
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

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/customer/orders");
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
      notify.success("Đã xác nhận nhận hàng và check-in.");
      navigate("/check-in?success=1", { replace: true });
    } catch (error) {
      console.error(error);
      notify.error("Không thể xác nhận nhận hàng. Vui lòng thử lại.");
    } finally {
      setConfirmingDelivery(false);
    }
  }

  function updateFoodReviewDraft(
    orderDetailId: string,
    patch: Partial<FoodReviewDraft>,
  ) {
    setFoodReviewDrafts((current) => {
      const previous = current[orderDetailId] ?? { rating: 0, content: "" };

      return {
        ...current,
        [orderDetailId]: {
          ...previous,
          ...patch,
        },
      };
    });
  }

  function toggleFoodReview(orderDetailId: string) {
    setActiveFoodReviewId((current) =>
      current === orderDetailId ? null : orderDetailId,
    );
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
  const isAccepted = normalizedOrderStatus === "accepted";
  const isCompleted = normalizedOrderStatus === "completed";
  const isOfflineOrder =
    normalizeString(summaryOrder?.deliveryAddress) === "tai quan" ||
    normalizeString(summaryOrder?.notes).includes("offline");
  const reviewLocked = hasReviewed || submittingReview;

  if (loading)
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] p-5 text-center text-slate-500 font-medium">
        Đang tải chi tiết đơn hàng...
      </div>
    );

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 py-8 text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-4 text-[13px] font-black text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:text-cyan-800 hover:shadow-md"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-4 text-[13px] font-black text-white shadow-lg shadow-cyan-900/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
          >
            Refresh
          </button>
        </div>

        <div className="relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl mix-blend-multiply" />

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
            Order Summary
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
            {title}
          </h1>

          <p className="mt-3 text-[22px] font-black text-cyan-700">
            {total.toLocaleString("vi-VN")}đ
          </p>

          {summaryOrder && (
            <div className="mt-5 space-y-2 text-[14px] text-slate-500 font-medium">
              <p className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Trạng thái:</span>{" "}
                <span className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-0.5 text-xs font-black text-cyan-700 shadow-sm">
                  {displayOrderStatus ?? summaryOrder.status}
                </span>
              </p>
              <p>
                <span className="font-bold text-slate-700">Ngày đặt:</span>{" "}
                {new Date(summaryOrder.orderedAt).toLocaleString("vi-VN")}
              </p>
              {summaryOrder.deliveryAddress && (
                <p>
                  <span className="font-bold text-slate-700">Địa chỉ:</span>{" "}
                  {summaryOrder.deliveryAddress}
                </p>
              )}
              {summaryOrder.notes && (
                <p>
                  <span className="font-bold text-slate-700">Ghi chú:</span>{" "}
                  {summaryOrder.notes}
                </p>
              )}
            </div>
          )}

          {effectiveOrderId && isAccepted ? (
            <div className="mt-6 rounded-2xl border border-cyan-200/60 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-5 py-4 text-[14px] text-cyan-900 shadow-sm backdrop-blur">
              <div className="font-black text-cyan-800 text-lg">
                Đơn đã được chấp nhận
              </div>
              <p className="mt-2 text-cyan-800/90 font-medium">
                {isOfflineOrder
                  ? "Đơn tại quán đã được merchant xác nhận. Sau khi ăn xong, mở bill để kiểm tra món, tổng tiền rồi thanh toán."
                  : "Đơn online đã được Merchant xác nhận. Khi bên giao hàng đưa đơn tới nơi, bấm đã nhận hàng để hệ thống hoàn tất check-in."}
              </p>
              <button
                type="button"
                onClick={() => void handleOpenCheckIn()}
                disabled={confirmingDelivery}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-2.5 text-[14px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
              >
                <Check size={18} />
                {isOfflineOrder ? "Xác nhận bill" : "Đã nhận hàng"}
              </button>
            </div>
          ) : effectiveOrderId ? (
            <div className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-5 py-4 text-[14px] font-bold text-amber-800 shadow-sm backdrop-blur">
              {getCustomerConfirmMessage(displayOrderStatus)}
            </div>
          ) : null}
        </div>

        <div
          id="review-section"
          className="mt-6 relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]"
        >
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl mix-blend-multiply" />
          <div className="relative flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-linear-to-r from-amber-50/80 to-orange-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800 ring-1 ring-amber-500/10">
                Feedback
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Đánh giá quán
              </h2>
              <p className="mt-1.5 text-[14px] font-medium text-slate-500">
                {merchantId
                  ? `Gửi nhận xét cho ${merchantName || "merchant này"}.`
                  : "Chưa xác định được merchant từ đơn hàng này."}
              </p>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[12px] font-black shadow-sm ${
                isCompleted
                  ? "border border-emerald-200/60 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200/60 bg-amber-50 text-amber-700"
              }`}
            >
              Trạng thái: {displayOrderStatus || "Đang tải"}
            </span>
          </div>

          <div className="relative">
            {!effectiveOrderId ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200/60 bg-slate-50/80 px-5 py-4 text-[14px] font-medium text-slate-500 backdrop-blur">
                Chưa ghép được mã đơn thật từ dữ liệu danh sách, nên trang này
                chỉ hiển thị thông tin tóm tắt.
              </p>
            ) : !isCompleted ? (
              <p className="mt-4 rounded-2xl border border-dashed border-amber-200/60 bg-amber-50/80 px-5 py-4 text-[14px] font-bold text-amber-800 backdrop-blur">
                Bạn chỉ có thể gửi đánh giá sau khi đơn hàng đã được xác nhận
                hoàn tất.
              </p>
            ) : hasReviewed ? (
              <p className="mt-4 rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/80 px-5 py-4 text-[14px] font-bold text-emerald-800 backdrop-blur">
                Đơn hàng này đã được đánh giá rồi, mỗi đơn chỉ đánh giá một lần.
              </p>
            ) : merchantId ? (
              <div className="mt-6 space-y-6">
                <div>
                  <p className="mb-3 text-[14px] font-black uppercase tracking-wider text-slate-800">
                    Chọn số sao
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const active = value <= reviewRating;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          disabled={reviewLocked}
                          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                            active
                              ? "border-amber-300 bg-linear-to-br from-amber-50 to-orange-50 text-amber-500 shadow-sm"
                              : "border-slate-200/60 bg-white/60 text-slate-300 hover:border-amber-200 hover:text-amber-400"
                          }`}
                          aria-label={`Chọn ${value} sao`}
                        >
                          <Star
                            size={20}
                            className={active ? "fill-amber-400" : ""}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="review-content"
                    className="mb-3 block text-[14px] font-black uppercase tracking-wider text-slate-800"
                  >
                    Nội dung đánh giá
                    <span className="ml-1.5 text-[11px] font-bold lowercase text-slate-400">
                      (không bắt buộc)
                    </span>
                  </label>
                  <textarea
                    id="review-content"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Chia sẻ cảm nhận của bạn về quán nếu muốn..."
                    disabled={reviewLocked}
                    className="min-h-32 w-full rounded-2xl border border-white/60 bg-white/70 px-5 py-4 text-[15px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                  />
                </div>

                {items.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-[14px] font-black uppercase tracking-wider text-slate-800">
                        Đánh giá từng món
                      </h3>
                      <p className="mt-1.5 text-[13px] font-medium text-slate-500">
                        Không bắt buộc. Món nào không chọn sao sẽ không gửi
                        review riêng.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {items.map((item) => {
                        const orderDetailId = getOrderDetailId(item);
                        if (!orderDetailId) return null;

                        const draft = foodReviewDrafts[orderDetailId] ?? {
                          rating: 0,
                          content: "",
                        };
                        const isOpen = activeFoodReviewId === orderDetailId;

                        return (
                          <div
                            key={`food-review-${orderDetailId}`}
                            className="rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[16px] font-bold text-slate-900">
                                  {item.name || "Món ăn"}
                                </p>
                                <p className="mt-1 text-[13px] font-bold text-slate-500">
                                  Số lượng:{" "}
                                  <span className="text-slate-700">
                                    {item.quantity || 0}
                                  </span>
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFoodReview(orderDetailId)}
                                disabled={reviewLocked}
                                className="rounded-xl border border-cyan-200/60 bg-white/70 px-4 py-2 text-[13px] font-black text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md disabled:opacity-60"
                              >
                                {isOpen ? "Ẩn món" : "Xem món"}
                              </button>
                            </div>

                            {draft.rating > 0 && !isOpen ? (
                              <p className="mt-3 text-[13px] font-bold text-amber-700 bg-amber-50/80 px-3 py-1.5 rounded-lg w-fit border border-amber-100/50">
                                Đã chọn {draft.rating}/5 sao cho món này.
                              </p>
                            ) : null}

                            {isOpen ? (
                              <div className="mt-5 space-y-4 border-t border-slate-200/50 pt-5">
                                <div className="flex flex-wrap gap-2">
                                  {Array.from({ length: 5 }).map((_, index) => {
                                    const value = index + 1;
                                    const active = value <= draft.rating;

                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                          updateFoodReviewDraft(orderDetailId, {
                                            rating:
                                              draft.rating === value
                                                ? 0
                                                : value,
                                          })
                                        }
                                        disabled={reviewLocked}
                                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
                                          active
                                            ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-500 shadow-sm"
                                            : "border-slate-200/60 bg-white/60 text-slate-300 hover:border-amber-200 hover:text-amber-400"
                                        }`}
                                        aria-label={`Chọn ${value} sao cho ${item.name || "món ăn"}`}
                                      >
                                        <Star
                                          size={16}
                                          className={
                                            active ? "fill-amber-400" : ""
                                          }
                                        />
                                      </button>
                                    );
                                  })}
                                </div>

                                <textarea
                                  value={draft.content}
                                  onChange={(event) =>
                                    updateFoodReviewDraft(orderDetailId, {
                                      content: event.target.value,
                                    })
                                  }
                                  placeholder="Nhận xét riêng cho món này nếu muốn..."
                                  disabled={reviewLocked}
                                  className="min-h-24 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSubmitReview()}
                  disabled={reviewLocked}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[15px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <Star size={18} className="fill-white" />
                  {hasReviewed
                    ? "Đã đánh giá"
                    : submittingReview
                      ? "Đang gửi..."
                      : "Gửi đánh giá"}
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200/60 bg-slate-50/80 px-5 py-4 text-[14px] font-medium text-slate-500 backdrop-blur">
                Không lấy được merchant của đơn này, nên chưa thể tạo đánh giá.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl mix-blend-multiply" />
          <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">
            Món đã đặt
          </h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.foodId}-${item.orderId}`}
                className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:bg-white/70"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-[16px] font-bold text-slate-900 truncate">
                    {item.name || "Món ăn"}
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-slate-500">
                    Số lượng:{" "}
                    <span className="text-slate-700">{item.quantity}</span>
                  </p>
                  {getOrderItemToppings(item).length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {getOrderItemToppings(item).map((topping) => (
                        <span
                          key={topping.id ?? topping.name}
                          className="rounded-full border border-emerald-200/60 bg-linear-to-r from-emerald-50 to-teal-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 shadow-sm"
                        >
                          +{topping.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {getOrderItemNotes(item) ? (
                    <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-slate-500 bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-100/50 w-fit">
                      {getOrderItemNotes(item)}
                    </p>
                  ) : null}
                </div>

                <p className="shrink-0 text-[16px] font-black text-cyan-700">
                  {Number(item.unitPrice || 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-[14px] font-medium text-slate-500 text-center py-6 bg-white/40 rounded-2xl border border-white/50 backdrop-blur">
              {effectiveOrderId
                ? "Không có món nào trong đơn."
                : "Backend chưa trả mã đơn nên chưa tải được danh sách món."}
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
  return item.orderDetailId || item.id || "";
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

function getOrderItemNotes(item: CustomerOrderDetailItem) {
  return item.notes ?? item.note ?? "";
}

function getOrderItemToppings(item: CustomerOrderDetailItem) {
  return item.toppings ?? [];
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
