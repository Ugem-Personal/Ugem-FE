import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCustomerOrderId,
  getCustomerOrders,
} from "../services/orderService";
import type { CustomerOrderSummary } from "@/shared/types";
import { notify } from "@/shared/lib/notify";

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);

  function getOrderSortTime(order: CustomerOrderSummary) {
    const parsedTime = new Date(order.orderedAt).getTime();

    return Number.isFinite(parsedTime) ? parsedTime : 0;
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const data = await getCustomerOrders();

        if (active) {
          const sortedOrders = [...(data ?? [])].sort(
            (left, right) => getOrderSortTime(right) - getOrderSortTime(left),
          );

          setOrders(sortedOrders);
        }
      } catch (error) {
        console.error(error);
        notify.error("Không tải được đơn hàng.");
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
  }, []);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/customer");
  }

  function handleViewDetail(
    order: CustomerOrderSummary,
    fallbackOrderNumber: number,
  ) {
    const orderRouteId =
      getCustomerOrderId(order) || `summary-${fallbackOrderNumber}`;

    navigate(`/customer/orders/${orderRouteId}`, {
      state: {
        order,
        fallbackOrderNumber,
      },
    });
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 py-8 text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-4xl">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-4 text-sm font-black text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:text-cyan-800 hover:shadow-md"
        >
          Back
        </button>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
            Order History
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Đơn hàng của tôi
          </h1>
          <p className="mt-3.5 text-sm font-medium leading-relaxed text-slate-500">
            Theo dõi lịch sử đặt món và trạng thái xử lý đơn hàng.
          </p>
        </div>

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order, index) => {
              const isCompleted = order.status?.toLowerCase() === "completed";
              const orderId = getCustomerOrderId(order);
              const key = orderId || `${order.name}-${order.orderedAt}`;
              const detailPath = orderId ? `/customer/orders/${orderId}` : null;

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem chi tiết đơn ${order.name}`}
                  onClick={() => handleViewDetail(order, index + 1)}
                  onKeyDown={(event) => {
                    if (event.currentTarget !== event.target) return;

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleViewDetail(order, index + 1);
                    }
                  }}
                  className="group relative overflow-hidden cursor-pointer rounded-4xl border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)] hover:border-white/80 focus:outline-none focus:ring-4 focus:ring-cyan-400/20"
                >
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full" />

                  <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="text-[19px] font-black tracking-tight text-slate-900 group-hover:text-cyan-800 transition-colors">
                        {order.name}
                      </p>
                      <p className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-200/60 bg-linear-to-r from-cyan-50/90 to-blue-50/90 px-3.5 py-1 text-[13px] font-black text-cyan-800 shadow-sm">
                        Trạng thái: {order.status}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {new Date(order.orderedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <p className="text-right text-[19px] font-black text-cyan-700">
                      {order.finalPrice.toLocaleString("vi-VN")}đ
                    </p>

                    <div className="space-y-1.5 sm:col-span-2 pt-2">
                      {order.deliveryAddress && (
                        <p className="text-[13px] font-medium leading-relaxed text-slate-500">
                          <span className="font-bold text-slate-700">
                            Địa chỉ:
                          </span>{" "}
                          {order.deliveryAddress}
                        </p>
                      )}

                      {order.notes && (
                        <p className="text-[13px] font-medium leading-relaxed text-slate-500">
                          <span className="font-bold text-slate-700">
                            Ghi chú:
                          </span>{" "}
                          {order.notes}
                        </p>
                      )}
                    </div>

                    {detailPath && isCompleted && (
                      <div className="flex flex-wrap gap-2 pt-4 sm:col-span-2 border-t border-slate-100/50 mt-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`${detailPath}#review-section`);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-2.5 text-[13px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                        >
                          Đánh giá
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {orders.length === 0 && (
              <p className="text-center text-slate-500">Chưa có đơn hàng.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
