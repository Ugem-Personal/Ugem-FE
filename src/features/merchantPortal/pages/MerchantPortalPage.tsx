import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Eye,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wallet,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { ApplicationStatusCard } from "../components/ApplicationStatusCard";
import { TipsSection } from "../components/TipsSection";
import { useMyApplications } from "../hooks/useMyApplications";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { OnboardingSteps } from "@/shared/layouts/Merchants/OnboardingSteps";
import { Button } from "@/shared/components/ui/button";
import { MerchantStatusBadge } from "@/shared/components";
import {
  getCurrentMerchantId,
  getMyMerchantDetail,
  getMyMerchantStatistics,
  type MerchantStatistics,
} from "../services";
import type { MerchantDetail } from "@/features/customer/types";

function handleSendApplication() {
  globalThis.location.href = "/merchant/application/create";
}

export function MerchantPortalPage() {
  const { data: applications = [], isLoading: isLoadingApp } = useMyApplications();
  const [stats, setStats] = useState<MerchantStatistics | null>(null);
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const merchantId = getCurrentMerchantId();
  const latestApplication = applications[0];
  const showSubmitCard = !latestApplication || latestApplication.status === "Rejected";

  useEffect(() => {
    let active = true;

    const loadPortalData = async () => {
      if (!merchantId) {
        setLoadingData(false);
        return;
      }

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
  }, [merchantId]);

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
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    <Store className="h-3.5 w-3.5" />
                    <span>Không gian Chủ quán UGem</span>
                  </div>
                  {merchant?.status && (
                    <MerchantStatusBadge status={merchant.status} />
                  )}
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {merchant?.name ? `Chào mừng ${merchant.name}` : "Chào mừng đến không gian quản lý UGem"}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Bảng điều khiển quản lý kinh doanh, thống kê doanh thu và phục vụ thực khách đích thực.
                </p>
              </div>

              {showSubmitCard ? (
                <Button
                  type="button"
                  onClick={handleSendApplication}
                  className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm px-6 shadow-md shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  Nộp Hồ Sơ Đăng Ký Quán
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/merchant/restaurant"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-400 dark:hover:border-cyan-500 transition"
                  >
                    <Store className="h-4 w-4" /> Chi tiết nhà hàng
                  </Link>
                  <Link
                    to="/merchant/orders"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 text-xs font-bold shadow-md shadow-cyan-500/20 transition"
                  >
                    <ShoppingBag className="h-4 w-4" /> Quản lý đơn hàng
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Business KPI Statistics (Real Backend Data) */}
          {merchantId && (
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
                subtext={`Đã trừ phí ${stats?.platformFeePercent ?? 5}% UGem`}
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
            {showSubmitCard && (
              <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="h-4 w-4" />
                    <span>Tham gia mạng lưới UGem</span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">Đăng ký quán ăn của bạn</h2>
                  <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    UGem thẩm định kỹ lưỡng nhằm tôn vinh những quán ăn chất lượng tốt nhất. Nộp hồ sơ để được xét duyệt nhanh chóng.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSendApplication}
                  className="mt-5 font-black text-xs sm:text-sm h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 w-fit"
                >
                  Gửi Hồ Sơ Ngay
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </article>
            )}

            {isLoadingApp ? (
              <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 flex items-center justify-center min-h-[180px]">
                <p className="text-xs font-bold text-slate-400 animate-pulse">Đang tải trạng thái ứng tuyển...</p>
              </section>
            ) : (
              <ApplicationStatusCard application={latestApplication} />
            )}
          </section>

          {showSubmitCard && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs">
              <OnboardingSteps />
            </div>
          )}

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
