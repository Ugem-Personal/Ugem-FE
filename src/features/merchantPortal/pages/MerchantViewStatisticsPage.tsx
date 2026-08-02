import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Banknote,
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  Megaphone,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";

import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import {
  getMerchantCampaignPerformance,
  getMerchantDashboardOverview,
  getMerchantOrderGrowthByYear,
  getMerchantRevenueByYear,
  getMerchantTopFoods,
  getMyMerchantStatistics,
  getMyMerchantViews,
  type MerchantCampaignPerformance,
  type MerchantDashboardOverview,
  type MerchantOrderGrowthByYear,
  type MerchantRevenueByYear,
  type MerchantStatistics,
  type MerchantTopFoods,
  type MerchantViewSummary,
} from "../services";

function formatNumber(value?: number | null) {
  return (value ?? 0).toLocaleString("vi-VN");
}

function formatCurrency(value?: number | null) {
  return `${formatNumber(value)}đ`;
}

function getErrorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as Error)?.message ||
    "Không tải được thông tin thống kê."
  );
}

export function MerchantViewStatisticsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [views, setViews] = useState<MerchantViewSummary | null>(null);
  const [stats, setStats] = useState<MerchantStatistics | null>(null);
  const [dashboard, setDashboard] = useState<MerchantDashboardOverview | null>(null);
  const [revenueByYear, setRevenueByYear] = useState<MerchantRevenueByYear | null>(null);
  const [orderGrowth, setOrderGrowth] = useState<MerchantOrderGrowthByYear | null>(null);
  const [topFoods, setTopFoods] = useState<MerchantTopFoods | null>(null);
  const [campaigns, setCampaigns] = useState<MerchantCampaignPerformance | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        viewData,
        statisticData,
        dashData,
        revData,
        growthData,
        foodData,
        campData,
      ] = await Promise.all([
        getMyMerchantViews().catch(() => null),
        getMyMerchantStatistics().catch(() => null),
        getMerchantDashboardOverview().catch(() => null),
        getMerchantRevenueByYear(selectedYear).catch(() => null),
        getMerchantOrderGrowthByYear(selectedYear).catch(() => null),
        getMerchantTopFoods(5).catch(() => null),
        getMerchantCampaignPerformance(10).catch(() => null),
      ]);

      setViews(viewData);
      setStats(statisticData);
      setDashboard(dashData);
      setRevenueByYear(revData);
      setOrderGrowth(growthData);
      setTopFoods(foodData);
      setCampaigns(campData);
    } catch (loadError) {
      console.error(loadError);
      const message = getErrorMessage(loadError);
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStatistics();
    });
  }, [loadStatistics]);

  const totalViews = stats?.totalViews ?? views?.totalViews ?? 0;
  const usRate = stats?.underratedScore ?? 0;

  // Max value calculation for revenue bar chart
  const maxMonthlyRevenue = revenueByYear?.months
    ? Math.max(...revenueByYear.months.map((m) => m.revenue), 1)
    : 1;

  // Max value calculation for order growth bar chart
  const maxMonthlyOrders = orderGrowth?.months
    ? Math.max(...orderGrowth.months.map((m) => m.totalOrders), 1)
    : 1;

  return (
    <main className="merchant-portal-layout relative bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_35%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_50%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_35%),linear-gradient(135deg,#0f172a_0%,#020617_50%,#0f172a_100%)] min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[32px_32px]" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          {/* Header Section */}
          <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-cyan-50 dark:border-cyan-900/50 dark:bg-cyan-950/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">
                  <BarChart3 size={14} />
                  Merchant Analytics
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  Báo cáo & Thống kê kinh doanh
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  Theo dõi lượt xem, doanh thu, đơn hàng, top món bán chạy và hiệu suất chiến dịch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Year filter dropdown */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                  <Calendar size={14} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Năm:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent font-black outline-none cursor-pointer"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                      <option key={yr} value={yr} className="bg-white dark:bg-slate-800">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void loadStatistics(true)}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white/90 dark:border-cyan-800 dark:bg-slate-800 px-4 py-2.5 text-xs font-black text-cyan-700 dark:text-cyan-300 shadow-xs transition hover:bg-cyan-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? "animate-spin" : undefined}
                  />
                  Làm mới
                </button>
              </div>
            </div>
          </section>

          {/* Error Banner */}
          {error ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-600" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadStatistics()}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Thử lại
                </button>
              </div>
            </section>
          ) : null}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs"
                  />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-3xl border border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs" />
            </div>
          ) : (
            <>
              {/* Top KPI Cards Grid */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  icon={<Eye size={18} />}
                  label="Lượt xem"
                  value={formatNumber(totalViews)}
                  tone="cyan"
                  hint="Tổng tương tác"
                />
                <KpiCard
                  icon={<ReceiptText size={18} />}
                  label="Tổng đơn hàng"
                  value={formatNumber(stats?.totalOrders ?? dashboard?.orders.total)}
                  tone="amber"
                  hint={`Đã trả: ${formatNumber(dashboard?.orders.paid ?? 0)}`}
                />
                <KpiCard
                  icon={<Banknote size={18} />}
                  label="Tổng doanh thu"
                  value={formatCurrency(stats?.totalRevenue ?? dashboard?.revenue.total)}
                  tone="emerald"
                  hint="Gross revenue"
                />
                <KpiCard
                  icon={<TrendingUp size={18} />}
                  label="Merchant nhận"
                  value={formatCurrency(stats?.merchantReceive)}
                  tone="violet"
                  hint="Net revenue"
                />
                <KpiCard
                  icon={<DollarSign size={18} />}
                  label="AOV trung bình"
                  value={formatCurrency(stats?.avgOrderValue)}
                  tone="blue"
                  hint="Doanh thu / Đơn"
                />
                <KpiCard
                  icon={<Award size={18} />}
                  label="Điểm US Score"
                  value={`${formatNumber(usRate)}%`}
                  tone="indigo"
                  hint="Underrated Score"
                />
              </section>

              {/* Financial & Platform Fee Breakdown Section */}
              <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-cyan-600" />
                        Phân bổ tài chính & Doanh thu
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Chi tiết doanh thu gộp, các khoản khấu trừ phí dịch vụ và giá trị thực nhận.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricBox
                      label="Tổng Doanh Thu (Gross)"
                      value={formatCurrency(stats?.totalRevenue)}
                      description="Tổng giá trị đơn hoàn tất"
                      accent="emerald"
                    />
                    <MetricBox
                      label="Merchant Thực Nhận (Net)"
                      value={formatCurrency(stats?.merchantReceive)}
                      description="Sau khi trừ phí dịch vụ"
                      accent="violet"
                    />
                    <MetricBox
                      label={`Phí nền tảng (${stats?.platformFeePercent ?? 0}%)`}
                      value={formatCurrency(stats?.platformFee)}
                      description="Phí duy trì hệ thống UGem"
                      accent="amber"
                    />
                    <MetricBox
                      label="Phí Reviewer / Affiliate"
                      value={formatCurrency(stats?.reviewerFee)}
                      description="Hoa hồng kênh tiếp thị liên kết"
                      accent="cyan"
                    />
                  </div>
                </article>

                <article className="rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-950 dark:text-white mb-1">
                      Tổng quan gian hàng
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                      {stats?.merchantName || dashboard?.merchant.name || "Nhà hàng của bạn"}
                    </p>

                    <div className="space-y-3">
                      <DetailRow
                        label="Đánh giá trung bình"
                        value={`${dashboard?.merchant.rating ?? 0} ⭐ (${dashboard?.merchant.reviewCount ?? 0} đánh giá)`}
                      />
                      <DetailRow
                        label="Tổng món ăn trong thực đơn"
                        value={`${dashboard?.foods.total ?? 0} món`}
                      />
                      <DetailRow
                        label="Chiến dịch đang hoạt động"
                        value={`${dashboard?.campaigns.active ?? 0} / ${dashboard?.campaigns.total ?? 0} chiến dịch`}
                      />
                      <DetailRow
                        label="Mã gian hàng (Merchant ID)"
                        value={stats?.merchantId || views?.merchantId || "-"}
                        isMono
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-900/50 p-3.5 text-xs text-cyan-800 dark:text-cyan-300 font-medium">
                    ✨ Mẹo: Tối ưu hóa thực đơn và cập nhật chiến dịch khuyến mãi để gia tăng lượt xem và doanh thu thực nhận!
                  </div>
                </article>
              </section>

              {/* Monthly Revenue & Order Growth Charts */}
              <section className="grid gap-6 xl:grid-cols-2">
                {/* Monthly Revenue Bar Chart */}
                <article className="rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-600" />
                        Doanh thu theo tháng (Năm {selectedYear})
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Thống kê tổng doanh thu phát sinh từ đơn hàng đã thanh toán qua các tháng.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(revenueByYear?.summary.totalRevenue)}
                    </span>
                  </div>

                  {revenueByYear?.months && revenueByYear.months.length > 0 ? (
                    <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2.5 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                      {revenueByYear.months.map((m) => {
                        const heightPercent = Math.max(
                          (m.revenue / maxMonthlyRevenue) * 100,
                          4,
                        );

                        return (
                          <div
                            key={m.month}
                            className="group relative flex flex-1 flex-col items-center h-full justify-end"
                          >
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-xl bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-xl group-hover:block whitespace-nowrap">
                              <p className="text-cyan-400">T{m.month}: {formatCurrency(m.revenue)}</p>
                              <p className="text-slate-300">{m.paidOrders} đơn hàng</p>
                            </div>

                            {/* Bar */}
                            <div
                              className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-cyan-600 to-emerald-500 transition-all duration-300 group-hover:brightness-110"
                              style={{ height: `${heightPercent}%` }}
                            />

                            {/* Month Label */}
                            <span className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              T{m.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 h-48 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs font-medium text-slate-400">
                      Chưa có dữ liệu doanh thu cho năm {selectedYear}.
                    </div>
                  )}
                </article>

                {/* Monthly Order Growth Bar Chart */}
                <article className="rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                        <ShoppingBag size={18} className="text-cyan-600" />
                        Tăng trưởng đơn hàng (Năm {selectedYear})
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Số lượng đơn hàng được tạo và hoàn tất theo từng tháng.
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                      {formatNumber(orderGrowth?.summary.totalOrders)} đơn
                    </span>
                  </div>

                  {orderGrowth?.months && orderGrowth.months.length > 0 ? (
                    <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2.5 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                      {orderGrowth.months.map((m) => {
                        const heightPercent = Math.max(
                          (m.totalOrders / maxMonthlyOrders) * 100,
                          4,
                        );

                        return (
                          <div
                            key={m.month}
                            className="group relative flex flex-1 flex-col items-center h-full justify-end"
                          >
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-14 z-20 hidden rounded-xl bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-xl group-hover:block whitespace-nowrap">
                              <p className="text-cyan-400">T{m.month}: {m.totalOrders} tổng đơn</p>
                              <p className="text-emerald-400">✓ {m.completed} hoàn tất</p>
                            </div>

                            {/* Bar */}
                            <div
                              className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-300 group-hover:brightness-110"
                              style={{ height: `${heightPercent}%` }}
                            />

                            {/* Month Label */}
                            <span className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              T{m.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 h-48 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs font-medium text-slate-400">
                      Chưa có dữ liệu đơn hàng cho năm {selectedYear}.
                    </div>
                  )}
                </article>
              </section>

              {/* Top Foods Ranking Table */}
              <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <div className="border-b border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                      <Utensils size={18} className="text-amber-500" />
                      Top 5 Món Ăn Bán Chạy Nhất
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Xếp hạng món ăn tạo ra số lượng bán và doanh thu cao nhất cho gian hàng.
                    </p>
                  </div>
                </div>

                {topFoods?.items && topFoods.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 font-black uppercase text-slate-400 dark:text-slate-500">
                        <tr>
                          <th className="px-6 py-3.5">Hạng</th>
                          <th className="px-6 py-3.5">Tên món ăn</th>
                          <th className="px-6 py-3.5 text-right">Số lượng bán</th>
                          <th className="px-6 py-3.5 text-right">Doanh thu tạo ra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {topFoods.items.map((item) => (
                          <tr
                            key={item.foodId}
                            className="transition hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20"
                          >
                            <td className="px-6 py-4">
                              <span
                                className={`inline-grid h-7 w-7 place-items-center rounded-lg font-black text-xs ${
                                  item.rank === 1
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : item.rank === 2
                                      ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                                      : item.rank === 3
                                        ? "bg-amber-800/20 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                #{item.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                              {item.foodName}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">
                              {formatNumber(item.quantitySold)} phần
                            </td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(item.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-medium text-slate-400">
                    Chưa có món ăn phát sinh lượt bán.
                  </div>
                )}
              </section>

              {/* Campaign Performance Table */}
              <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <div className="border-b border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                      <Megaphone size={18} className="text-cyan-600" />
                      Hiệu Suất Chiến Dịch Khuyến Mãi
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Thống kê doanh thu, số lượt đơn và giảm giá của các chiến dịch đã triển khai.
                    </p>
                  </div>
                </div>

                {campaigns?.items && campaigns.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 font-black uppercase text-slate-400 dark:text-slate-500">
                        <tr>
                          <th className="px-6 py-3.5">Hạng</th>
                          <th className="px-6 py-3.5">Chiến dịch</th>
                          <th className="px-6 py-3.5">Trạng thái</th>
                          <th className="px-6 py-3.5 text-right">Lượt dùng</th>
                          <th className="px-6 py-3.5 text-right">Số đơn</th>
                          <th className="px-6 py-3.5 text-right">Doanh thu tạo ra</th>
                          <th className="px-6 py-3.5 text-right">Tổng giảm giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {campaigns.items.map((camp) => (
                          <tr
                            key={camp.campaignId}
                            className="transition hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20"
                          >
                            <td className="px-6 py-4 font-bold text-slate-400">
                              #{camp.rank}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 dark:text-white">{camp.name}</p>
                              {camp.description ? (
                                <p className="text-[10px] text-slate-400 truncate max-w-xs">{camp.description}</p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                  camp.status === "Active"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : camp.status === "Upcoming"
                                      ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {camp.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                              {camp.usedCount} / {camp.usageLimit ?? "∞"}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                              {camp.completedPaidOrders} đơn
                            </td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(camp.totalRevenue)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                              -{formatCurrency(camp.totalDiscount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-medium text-slate-400">
                    Chưa có dữ liệu chiến dịch khuyến mãi.
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "amber" | "violet" | "blue" | "indigo";
  hint: string;
}) {
  const toneClass = {
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900/50",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50",
    amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/50",
    violet: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/50",
    blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/50",
  }[tone];

  return (
    <article className="rounded-2xl border border-white/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`grid h-9 w-9 place-items-center rounded-xl border ${toneClass}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {hint}
        </span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </article>
  );
}

function MetricBox({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  accent: "emerald" | "violet" | "amber" | "cyan";
}) {
  const accentClass = {
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
    violet: "border-violet-100 bg-violet-50/50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300",
    amber: "border-amber-100 bg-amber-50/50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
    cyan: "border-cyan-100 bg-cyan-50/50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300",
  }[accent];

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <span className="text-xs font-bold block opacity-80">{label}</span>
      <span className="mt-1.5 text-xl font-black block text-slate-950 dark:text-white">{value}</span>
      <span className="mt-1 text-[11px] font-medium block opacity-75">{description}</span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  isMono,
}: {
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-2.5">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`break-all text-right text-xs font-black text-slate-950 dark:text-white ${isMono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
