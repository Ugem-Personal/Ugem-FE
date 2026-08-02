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
    <main className="merchant-portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Hero Welcome Section */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    <Store className="h-3.5 w-3.5" />
                    <span>UGem Merchant Workspace</span>
                  </div>
                  {merchant?.status && (
                    <MerchantStatusBadge status={merchant.status} />
                  )}
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {merchant?.name ? `Chào mừng ${merchant.name}` : "Chào Mừng Quán Ăn Đến UGem"}
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl">
                  Bảng điều khiển quản lý kinh doanh, thống kê doanh thu và phục vụ thực khách đích thực.
                </p>
              </div>

              {showSubmitCard ? (
                <Button
                  type="button"
                  onClick={handleSendApplication}
                  className="h-12 shrink-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 font-black text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 active:scale-95"
                >
                  Nộp Hồ Sơ Đăng Ký Quán
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/merchant/restaurant"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-4 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                  >
                    <Store className="h-4 w-4" /> Chi tiết nhà hàng
                  </Link>
                  <Link
                    to="/merchant/orders"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md transition"
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
          <section className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Thao tác nhanh Workspace
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
          <section className="grid lg:grid-cols-2 gap-6">
            {showSubmitCard && (
              <article className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 shadow-xl backdrop-blur-2xl">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Tham gia mạng lưới UGem</span>
                </div>
                <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">Đăng Ký Quán Ăn Của Bạn</h2>
                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  UGem thẩm định kỹ lưỡng nhằm tôn vinh những quán ăn chất lượng tốt nhất. Nộp hồ sơ để được xét duyệt nhanh chóng.
                </p>

                <Button
                  type="button"
                  onClick={handleSendApplication}
                  className="mt-5 font-bold rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  Gửi Hồ Sơ Ngay
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </article>
            )}

            {isLoadingApp ? (
              <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 shadow-xl flex items-center justify-center">
                <p className="text-xs font-bold text-slate-400 animate-pulse">Đang tải trạng thái ứng tuyển...</p>
              </section>
            ) : (
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 shadow-xl backdrop-blur-2xl">
                <ApplicationStatusCard application={latestApplication} />
              </div>
            )}
          </section>

          {showSubmitCard && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 shadow-xl">
              <OnboardingSteps />
            </div>
          )}

          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-6 shadow-xl">
            <TipsSection />
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-600 to-indigo-600 p-6 text-center shadow-lg">
            <p className="relative text-sm font-black text-white tracking-wide">
              “Nơi những giá trị ẩm thực đích thực được tôn vinh.”
            </p>
          </section>
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
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-2xl transition-colors duration-300">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
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
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 shadow-lg backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/30 flex flex-col justify-between"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-3 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
          {desc}
        </p>
      </div>
    </Link>
  );
}
