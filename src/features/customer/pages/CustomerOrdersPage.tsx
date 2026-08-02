import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  confirmReceived,
  getCustomerOrderId,
  getCustomerOrders,
} from "../services/orderService";
import type { CustomerOrderSummary } from "@/shared/types";
import { notify } from "@/shared/lib/notify";
import { ModeToggle } from "@/shared/components";
import { OrderCard, OrderCardSkeleton } from "../components/OrderCard";

type OrderFilterTab =
  | "all"
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Delivering"
  | "Completed"
  | "Cancelled";

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderFilterTab>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<{
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } | null>(null);

  function getOrderSortTime(order: CustomerOrderSummary) {
    const parsedTime = new Date(order.orderedAt).getTime();
    return Number.isFinite(parsedTime) ? parsedTime : 0;
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      const statusFilter = activeTab === "all" ? undefined : activeTab;

      const res = await getCustomerOrders({
        pageIndex,
        pageSize: 10,
        status: statusFilter,
      });

      const sortedOrders = [...(res.data ?? [])].sort(
        (left, right) => getOrderSortTime(right) - getOrderSortTime(left),
      );
      setOrders(sortedOrders);
      setPaginationMeta(res.meta ?? null);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được lịch sử đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, activeTab]);

  useEffect(() => {
    let active = true;

    const statusFilter = activeTab === "all" ? undefined : activeTab;

    getCustomerOrders({
      pageIndex,
      pageSize: 10,
      status: statusFilter,
    })
      .then((res) => {
        if (!active) return;
        const sortedOrders = [...(res.data ?? [])].sort(
          (left, right) => getOrderSortTime(right) - getOrderSortTime(left),
        );
        setOrders(sortedOrders);
        setPaginationMeta(res.meta ?? null);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        notify.error("Không tải được lịch sử đơn hàng.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pageIndex, activeTab]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderId = getCustomerOrderId(order) ?? "";
      const keyword = searchKeyword.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        (order.name ?? "").toLowerCase().includes(keyword) ||
        (order.deliveryAddress ?? "").toLowerCase().includes(keyword) ||
        (order.notes ?? "").toLowerCase().includes(keyword) ||
        orderId.toLowerCase().includes(keyword);

      return matchesSearch;
    });
  }, [orders, searchKeyword]);

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

  function handleQuickReview(order: CustomerOrderSummary) {
    const orderId = getCustomerOrderId(order);
    if (!orderId) return;

    navigate(`/customer/orders/${orderId}#review-section`);
  }

  async function handleQuickConfirm(order: CustomerOrderSummary) {
    const orderId = getCustomerOrderId(order);
    if (!orderId) return;

    const isOffline =
      order.orderType?.trim().toLowerCase() === "offline" ||
      (order.deliveryAddress ?? "").toLowerCase().includes("tại quán");

    if (isOffline) {
      navigate(`/orders/confirm?orderId=${encodeURIComponent(orderId)}`);
      return;
    }

    try {
      await confirmReceived(orderId);
      notify.success("Đã xác nhận nhận hàng thành công.");
      void fetchOrders();
    } catch (error) {
      console.error(error);
      notify.error("Không thể xác nhận nhận hàng. Vui lòng thử lại.");
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Glow Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Top Navbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
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
              onClick={() => void fetchOrders()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
            <ModeToggle />
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            <ShoppingBag className="h-3.5 w-3.5" /> Track & Manage Orders
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            Đơn hàng của tôi
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            Theo dõi trạng thái thời gian thực và lịch sử đơn đặt món của bạn.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-1.5 shadow-2xs backdrop-blur-md">
            {[
              { key: "all", label: `Tất cả (${orders.length})` },
              { key: "Pending", label: "Chờ nhận" },
              { key: "Accepted", label: "Đã nhận" },
              { key: "Preparing", label: "Đang làm" },
              { key: "Ready", label: "Chờ giao" },
              { key: "Delivering", label: "Đang giao" },
              { key: "Completed", label: "Hoàn thành" },
              { key: "Cancelled", label: "Đã hủy" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as OrderFilterTab);
                  setPageIndex(1);
                }}
                className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeTab === tab.key
                    ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPageIndex(1);
              }}
              placeholder="Tìm trong trang hiện tại..."
              className="h-11 w-full sm:w-64 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 pl-10 pr-4 text-xs font-bold text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-cyan-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Order List / Skeleton / Empty State */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <OrderCard
                key={getCustomerOrderId(order) || index}
                order={order}
                fallbackOrderNumber={index + 1}
                onViewDetail={handleViewDetail}
                onQuickReview={handleQuickReview}
                onQuickConfirm={(ord) => void handleQuickConfirm(ord)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 p-12 text-center shadow-2xs backdrop-blur-md">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Không tìm thấy đơn hàng nào
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchKeyword || activeTab !== "all"
                ? "Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục tab khác."
                : "Bạn chưa thực hiện đơn đặt món nào. Khám phá ngay các quán ăn chất lượng xung quanh!"}
            </p>
            <button
              type="button"
              onClick={() => navigate("/customer")}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-6 py-3 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition"
            >
              Khám phá món ngay
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {paginationMeta && paginationMeta.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-4 shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
              disabled={pageIndex <= 1 || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Trang trước
            </button>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Trang {paginationMeta.pageIndex} / {paginationMeta.totalPages} ({paginationMeta.totalItems} đơn hàng)
            </span>
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.min(paginationMeta.totalPages, p + 1))}
              disabled={pageIndex >= paginationMeta.totalPages || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"
            >
              Trang sau <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
