import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  QrCode,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wallet,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { TableQrGeneratorModal } from "../components/TableQrGeneratorModal";
import { ApplicationStatusCard } from "../components/ApplicationStatusCard";
import { TipsSection } from "../components/TipsSection";
import { useMyApplications } from "../hooks/useMyApplications";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { OnboardingSteps } from "@/shared/layouts/Merchants/OnboardingSteps";
import { MerchantStatusBadge } from "@/shared/components";
import {
  getMyMerchantDetail,
  getMyMerchantStatistics,
  type MerchantStatistics,
} from "../services";
import type { MerchantDetail } from "@/features/customer/types";

export function MerchantPortalPage() {
  const { data: applications = [], isLoading: isLoadingApp } = useMyApplications();
  const [stats, setStats] = useState<MerchantStatistics | null>(null);
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const latestApplication = applications[0];

  useEffect(() => {
    let active = true;

    const loadPortalData = async () => {
      setLoadingData(true);

      try {
        const [merchantRes, statsRes] = await Promise.allSettled([
          getMyMerchantDetail(),
          getMyMerchantStatistics(),
        ]);

        if (!active) return;

        if (merchantRes.status === "fulfilled") {
          setMerchant(merchantRes.value);
        }

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };

    void loadPortalData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="merchant-portal-layout min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/5 dark:bg-cyan-600/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content w-full max-w-[1240px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1">
          {/* Hero Welcome Section */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs backdrop-blur-xl transition-colors duration-300">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    <Store className="h-3.5 w-3.5" />
                    <span>Không gian Chủ quán UFind</span>
                  </div>
                  {merchant?.status && (
                    <MerchantStatusBadge status={merchant.status} />
                  )}
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {merchant?.name ? `Chào mừng ${merchant.name}` : "Chào mừng đến không gian quản lý UFind"}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Bảng điều khiển quản lý kinh doanh, thống kê doanh thu và phục vụ thực khách đích thực.
                </p>
              </div>
            </div>
            {merchant && (
          <TableQrGeneratorModal
            open={qrModalOpen}
            onOpenChange={setQrModalOpen}
            merchantId={merchant.id}
            merchantName={merchant.name || ""}
            merchantAddress={merchant.address}
          />
        )}
      </section>

          {/* Business KPI Statistics (Real Backend Data) */}
          {merchant && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PortalKpiCard
                icon={Eye}
                label="Lượt xem quán"
                value={loadingData ? "..." : (stats?.totalViews ?? merchant?.totalViews ?? 0).toLocaleString("vi-VN")}
                subtext="Số lượt thực khách truy cập"
                color="cyan"
              />
              <PortalKpiCard
                icon={ShoppingBag}
                label="Đơn thành công"
                value={loadingData ? "..." : (stats?.totalOrders ?? 0).toLocaleString("vi-VN")}
                subtext="Tổng số đơn đã hoàn tất"
                color="indigo"
              />
              <PortalKpiCard
                icon={Wallet}
                label="Doanh thu thực nhận"
                value={loadingData ? "..." : `${(stats?.merchantReceive ?? stats?.totalRevenue ?? 0).toLocaleString("vi-VN")}đ`}
                subtext={`Đã trừ phí ${stats?.platformFeePercent ?? 5}% UFind`}
                color="emerald"
              />
              <PortalKpiCard
                icon={TrendingUp}
                label="Giá trị đơn trung bình"
                value={loadingData ? "..." : `${(stats?.avgOrderValue ?? 0).toLocaleString("vi-VN")}đ`}
                subtext="Doanh thu / số lượng đơn"
                color="amber"
              />
            </section>
          )}

          {/* Underrated Score & Rebalancing Radar Widget */}
          {merchant && (
            <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl backdrop-blur-xl">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/20 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider text-cyan-300">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      UFind Rebalancing Engine
                    </span>
                    {(merchant.underratedScore && Number(merchant.underratedScore) >= 3.0) || merchant.isUnderrated ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        💎 Đang được đẩy ưu tiên trên Radar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300">
                        🌟 Quán Ẩm Thực Nổi Bật
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Chỉ Số Radar & Điểm Tiềm Năng (US)
                  </h2>

                  <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
                    Thuật toán UFind tính toán <strong className="text-cyan-300">Điểm Tiềm Năng (US)</strong> dựa trên Chất Lượng Đánh Giá và Chỉ Số Sức Mạnh (SI) để tự động đưa quán ngon núp hẻm tiếp cận hàng nghìn thực khách quanh khu vực.
                  </p>
                </div>

                {/* Score Stats Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Chất lượng
                    </p>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-amber-400">
                      {merchant.rating ? Number(merchant.rating).toFixed(1) : "5.0"}★
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {merchant.reviewCount || 0} đánh giá
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Sức Mạnh (SI)
                    </p>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-indigo-400">
                      {merchant.strengthIndex ? Number(merchant.strengthIndex).toFixed(1) : "12.5"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Độ phủ & tương tác
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-center backdrop-blur-md">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                      Điểm Tiềm Năng (US)
                    </p>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-cyan-400">
                      {merchant.underratedScore ? Number(merchant.underratedScore).toFixed(2) : "4.45"}
                    </p>
                    <p className="text-[10px] text-cyan-300/80 mt-0.5">
                      Ưu tiên Radar
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar inside Widget */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Mẹo: Nhắc khách quét QR bàn và đánh giá kèm ảnh (+20 điểm) để tối ưu điểm US.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md transition"
                >
                  <QrCode className="h-4 w-4" /> Tạo & In mã QR bàn
                </button>
              </div>
            </section>
          )}

          {/* Quick Actions Grid */}
          <section className="space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Thao tác nhanh
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <QuickActionCard
                to="/merchant/foods"
                icon={UtensilsCrossed}
                title="Quản lý Món ăn"
                desc="Cập nhật thực đơn, giá bán"
              />
              <QuickActionCard
                to="/merchant/orders"
                icon={ShoppingBag}
                title="Đơn hàng"
                desc="Theo dõi & xử lý đơn món"
              />
              <QuickActionCard
                to="/merchant/restaurant"
                icon={Store}
                title="Thông tin Nhà hàng"
                desc="Giờ mở cửa, logo, địa chỉ"
              />
              <QuickActionCard
                to="/merchant/statistics"
                icon={BarChart3}
                title="Thống kê"
                desc="Xem báo cáo doanh thu"
              />
              <QuickActionCard
                to="/merchant/profile"
                icon={UserCheck}
                title="Hồ sơ Tài khoản"
                desc="Thông tin tài khoản Merchant"
              />
            </div>
          </section>

          {/* Application Status / Onboarding Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs backdrop-blur-xl">
              <OnboardingSteps />
            </div>

            {isLoadingApp ? (
              <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 flex items-center justify-center min-h-[180px]">
                <p className="text-xs font-bold text-slate-400 animate-pulse">Đang tải trạng thái ứng tuyển...</p>
              </section>
            ) : (
              <ApplicationStatusCard application={latestApplication} />
            )}
          </section>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs">
            <TipsSection />
          </div>

          {/* Footer Quote */}
          <footer className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900 dark:bg-slate-900/90 p-5 text-center text-slate-100">
            <p className="text-xs sm:text-sm font-bold tracking-wide text-cyan-300 italic">
              “Nơi những giá trị ẩm thực đích thực được tôn vinh.”
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}

function PortalKpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  subtext: string;
  color: "cyan" | "indigo" | "emerald" | "amber";
}) {
  const colorMap = {
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-5 shadow-xs backdrop-blur-xl transition-colors duration-300">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl border ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {subtext}
      </p>
    </div>
  );
}

function QuickActionCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Eye;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-md flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-3 group-hover:scale-105 transition-transform">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
          {desc}
        </p>
      </div>
    </Link>
  );
}
