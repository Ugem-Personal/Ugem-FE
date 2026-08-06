import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Store,
  ArrowRight,
  Info,
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  Building2,
  Clock,
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import type { MerchantDetail } from "@/features/customer/types";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { getUserProfile, type UserProfile } from "@/shared/services";
import { getMyMerchantDetail } from "../services";
import { MerchantStatusBadge } from "@/shared/components";

function getInitial(name?: string) {
  return (name || "M").trim().charAt(0).toUpperCase() || "M";
}

export default function MerchantProfilePage() {
  const user = getCurrentUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [uProfile, mDetail] = await Promise.all([
          getUserProfile().catch(() => null),
          getMyMerchantDetail().catch(() => null),
        ]);

        if (active) {
          setUserProfile(uProfile);
          setMerchantDetail(mDetail);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const profile = useMemo(() => {
    return {
      displayName: userProfile?.fullName || userProfile?.name || user?.Name || "Merchant Owner",
      email: userProfile?.email || merchantDetail?.email || user?.Email || "-",
      role: userProfile?.role || user?.Role || "Merchant",
      phoneNumber: userProfile?.phoneNumber || merchantDetail?.phone || "Chưa cập nhật",
      userId: userProfile?.userId || userProfile?.id || user?.UserId || "-",
    };
  }, [
    merchantDetail?.email,
    merchantDetail?.phone,
    user?.Email,
    user?.Name,
    user?.Role,
    user?.UserId,
    userProfile,
  ]);

  return (
    <main className="merchant-portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex">
      {/* Ambient Glow Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-300 backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> UGem Merchant Workspace
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Xin chào, {profile.displayName}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Chào mừng bạn đến với Cổng Quản lý Chủ quán UGem. Hãy cập nhật đầy đủ thông tin cửa hàng để sẵn sàng đón nhận hàng ngàn đơn hàng mỗi ngày.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/merchant/restaurant"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition active:scale-95"
                >
                  <Store className="h-4 w-4" /> Quản lý Nhà hàng
                </Link>
                <Link
                  to="/merchant/create-order"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-xs font-black text-white backdrop-blur-md hover:bg-white/20 transition active:scale-95"
                >
                  <Zap className="h-4 w-4 text-amber-400" /> Tạo đơn nhanh
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Building2}
              title="Tên Quán"
              value={merchantDetail?.name || "Chưa thiết lập"}
              subtitle={merchantDetail?.restaurantType || "Loại hình chưa chọn"}
              color="cyan"
            />
            <MetricCard
              icon={CheckCircle2}
              title="Trạng thái Hồ sơ"
              value={merchantDetail?.status ? "Đã xét duyệt" : "Chờ cập nhật"}
              subtitle={merchantDetail?.status ? "Đủ điều kiện kinh doanh" : "Cần hoàn thiện hồ sơ"}
              color="emerald"
            />
            <MetricCard
              icon={Clock}
              title="Giờ Mở Cửa"
              value={merchantDetail?.openingHours || "08:00 - 22:00"}
              subtitle="Thời gian phục vụ khách"
              color="indigo"
            />
            <MetricCard
              icon={ShieldCheck}
              title="Cấp độ Tài khoản"
              value="Merchant Verified"
              subtitle="Xác thực bảo mật 2 lớp"
              color="amber"
            />
          </div>

          {/* Main Bento Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Box: Account Profile Card (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:border-cyan-500/40">
                <div className="text-center pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="relative mx-auto inline-block">
                    <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-4xl font-black text-white shadow-xl shadow-cyan-500/25 ring-4 ring-white/20">
                      {getInitial(profile.displayName)}
                    </div>
                    <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-xl bg-emerald-500 text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </div>

                  <h2 className="mt-4 truncate text-xl font-black text-slate-950 dark:text-white">
                    {profile.displayName}
                  </h2>

                  <p className="mt-1 truncate text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    {profile.email}
                  </p>

                  <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      {profile.role}
                    </span>
                    {merchantDetail?.status && (
                      <MerchantStatusBadge status={merchantDetail.status} />
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-6">
                  <ProfileInfoRow icon={ShieldCheck} label="Quyền hạn" value={profile.role} />
                  <ProfileInfoRow icon={Mail} label="Email tài khoản" value={profile.email} isLocked />
                  <ProfileInfoRow icon={Phone} label="Số điện thoại" value={profile.phoneNumber} />
                  <ProfileInfoRow icon={IdCard} label="User ID" value={profile.userId} isLocked />
                </div>
              </div>
            </div>

            {/* Right Box: Account vs Business Distinction & Restaurant Quick Link (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:border-cyan-500/40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-xs">
                    <Info className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Phân biệt Hồ sơ Tài khoản & Nhà hàng</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quy định quản lý dữ liệu đối tác Merchant UGem</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 sm:p-5">
                    <p className="font-black text-cyan-700 dark:text-cyan-300 text-sm mb-1.5 flex items-center gap-2">
                      <UserRound className="h-4 w-4" /> 1. Thông tin Tài khoản (User Profile)
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Bao gồm Tên chủ tài khoản, Email và Quyền hạn Merchant. Các thông tin này đại diện cho danh tính đăng nhập cá nhân và được bảo vệ cố định bởi Admin hệ thống.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
                    <p className="font-black text-indigo-700 dark:text-indigo-300 text-sm mb-1.5 flex items-center gap-2">
                      <Store className="h-4 w-4" /> 2. Thông tin Nhà hàng (Restaurant Business)
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Bao gồm Tên quán ăn, Giờ mở cửa, Số điện thoại nhà hàng, Địa chỉ bản đồ, Logo và Mô tả món ăn. Bạn có thể cập nhật và chỉnh sửa trực tiếp tại trang <strong>Thông tin Nhà hàng</strong>.
                    </p>
                  </div>
                </div>

                {/* Quick Link Card */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-indigo-500/5 to-transparent p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500 text-slate-950 font-black shadow-md">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-950 dark:text-white">Cập nhật hồ sơ Nhà hàng</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sửa tên quán, địa chỉ bản đồ, SĐT, giờ mở cửa & logo</p>
                    </div>
                  </div>

                  <Link
                    to="/merchant/restaurant"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition active:scale-95"
                  >
                    Đến trang Nhà hàng <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: typeof Building2;
  title: string;
  value: string;
  subtitle: string;
  color: "cyan" | "emerald" | "indigo" | "amber";
}) {
  const colorStyles = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-4 shadow-lg backdrop-blur-xl transition hover:border-cyan-500/40">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${colorStyles[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
            {title}
          </p>
          <p className="text-xs sm:text-sm font-black text-slate-950 dark:text-white truncate mt-0.5">
            {value}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
  isLocked,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  isLocked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
        </div>
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
