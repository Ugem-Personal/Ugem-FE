import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Banknote,
  Eye,
  RefreshCw,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import {
  getMyMerchantStatistics,
  getMyMerchantViews,
  type MerchantStatistics,
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
    "Không tải được thống kê."
  );
}

export function MerchantViewStatisticsPage() {
  const [views, setViews] = useState<MerchantViewSummary | null>(null);
  const [stats, setStats] = useState<MerchantStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadStatistics(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [viewData, statisticData] = await Promise.all([
        getMyMerchantViews(),
        getMyMerchantStatistics(),
      ]);

      setViews(viewData ?? null);
      setStats(statisticData ?? null);
    } catch (loadError) {
      console.error(loadError);
      const message = getErrorMessage(loadError);
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadStatistics();
    });
  }, []);

  const totalViews = stats?.totalViews ?? views?.totalViews ?? 0;
  const usRate = stats?.underratedScore ?? 0;

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                  <BarChart3 size={14} />
                  Merchant analytics
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950">
                  Thống kê lượt xem
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  Theo dõi lượt xem, đơn hàng và doanh thu hiện tại của nhà hàng.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadStatistics(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white/80 px-4 py-2.5 text-sm font-black text-cyan-700 shadow-sm transition hover:bg-cyan-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : undefined}
                />
                Làm mới
              </button>
            </div>
          </section>

          {error ? (
            <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </section>
          ) : null}

          {loading ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-white/60 bg-white/60 shadow-sm"
                />
              ))}
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={<Eye size={20} />}
                  label="Tổng lượt xem"
                  value={formatNumber(totalViews)}
                  tone="cyan"
                />
                <StatCard
                  icon={<ReceiptText size={20} />}
                  label="Tổng đơn hàng"
                  value={formatNumber(stats?.totalOrders)}
                  tone="emerald"
                />
                <StatCard
                  icon={<Banknote size={20} />}
                  label="Tổng doanh thu"
                  value={formatCurrency(stats?.totalRevenue)}
                  tone="amber"
                />
                <StatCard
                  icon={<TrendingUp size={20} />}
                  label="Merchant nhận"
                  value={formatCurrency(stats?.merchantReceive)}
                  tone="violet"
                />
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        Hiệu suất nhà hàng
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {stats?.merchantName || "Nhà hàng của bạn"}
                      </p>
                    </div>
                    <Activity className="text-cyan-700" size={22} />
                  </div>

                  <div className="space-y-4">
                    <ProgressLine
                      label="Lượt xem"
                      value={totalViews}
                      max={Math.max(totalViews, stats?.totalOrders ?? 0, 1)}
                      display={formatNumber(totalViews)}
                    />
                    <ProgressLine
                      label="Đơn hàng"
                      value={stats?.totalOrders ?? 0}
                      max={Math.max(totalViews, stats?.totalOrders ?? 0, 1)}
                      display={formatNumber(stats?.totalOrders)}
                    />
                    <ProgressLine
                      label="Điểm underrated"
                      value={stats?.underratedScore ?? 0}
                      max={100}
                      display={formatNumber(stats?.underratedScore)}
                    />
                  </div>
                </article>

                <article className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-black text-slate-950">
                    Tài chính
                  </h2>
                  <div className="mt-5 space-y-3">
                    <MetricRow
                      label="Tổng doanh thu"
                      value={formatCurrency(stats?.totalRevenue)}
                    />
                    <MetricRow
                      label="Merchant nhận"
                      value={formatCurrency(stats?.merchantReceive)}
                    />
                    <MetricRow
                      label="Affiliate/reviewer fee"
                      value={formatCurrency(stats?.reviewerFee)}
                    />
                    <MetricRow
                      label="Phí nền tảng"
                      value={formatCurrency(stats?.platformFee)}
                    />
                    <MetricRow
                      label="Giá trị đơn trung bình"
                      value={formatCurrency(stats?.avgOrderValue)}
                    />
                    <MetricRow
                      label="Tỷ lệ phí nền tảng"
                      value={`${formatNumber(stats?.platformFeePercent)}%`}
                    />
                    <MetricRow
                      label="Tỷ lệ US"
                      value={`${formatNumber(usRate)}%`}
                    />
                    <MetricRow
                      label="Merchant ID"
                      value={stats?.merchantId || views?.merchantId || "-"}
                    />
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClass = {
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  }[tone];

  return (
    <article className="rounded-[22px] border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur">
      <div
        className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border ${toneClass}`}
      >
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-2xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}

function ProgressLine({
  label,
  value,
  max,
  display,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
}) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-black text-slate-950">{display}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-500 to-emerald-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="break-all text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}
