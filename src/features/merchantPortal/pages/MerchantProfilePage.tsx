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
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import type { MerchantDetail } from "@/features/customer/types";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import { getMyMerchantDetail } from "../services";
import { MerchantStatusBadge } from "@/shared/components";

function getInitial(name?: string) {
  return (name || "M").trim().charAt(0).toUpperCase() || "M";
}

export default function MerchantProfilePage() {
  const user = getCurrentUser();
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    const loadMerchantDetail = async () => {
      try {
        const data = await getMyMerchantDetail();

        if (active) {
          setMerchantDetail(data);
        }
      } catch (error) {
        console.error(error);
        notify.error("Không tải được thông tin Merchant.");
      }
    };

    void loadMerchantDetail();

    return () => {
      active = false;
    };
  }, []);

  const profile = useMemo(() => {
    return {
      displayName: user?.Name || "Merchant Owner",
      email: merchantDetail?.email || user?.Email || "-",
      role: user?.Role || "Merchant",
      phoneNumber: merchantDetail?.phone || "Chưa cập nhật",
      userId: user?.UserId || "-",
    };
  }, [
    merchantDetail?.email,
    merchantDetail?.phone,
    user?.Email,
    user?.Name,
    user?.Role,
    user?.UserId,
  ]);

  return (
    <main className="merchant-portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                <UserRound className="h-3.5 w-3.5" /> Merchant Account Profile
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Hồ Sơ Tài Khoản Merchant
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Thông tin người sở hữu tài khoản doanh nghiệp Merchant trên UGem System.
              </p>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Box: Account Profile Card (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-2xl transition-colors duration-300">
                <div className="text-center pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-4xl font-black text-white shadow-xl shadow-cyan-500/20 ring-4 ring-white/20">
                    {getInitial(profile.displayName)}
                  </div>

                  <h2 className="mt-4 truncate text-xl font-black text-slate-950 dark:text-white">
                    {profile.displayName}
                  </h2>

                  <p className="mt-1 truncate text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    {profile.email}
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2">
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
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Info className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Phân biệt Hồ sơ Tài khoản & Nhà hàng</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quy định quản lý dữ liệu đối tác Merchant UGem</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <p className="font-black text-cyan-700 dark:text-cyan-300 mb-1">1. Thông tin Tài khoản (User Profile)</p>
                    <p>Bao gồm Tên chủ tài khoản, Email và Quyền hạn Merchant. Các thông tin này đại diện cho danh tính đăng nhập và được bảo vệ cố định bởi Admin hệ thống.</p>
                  </div>

                  <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                    <p className="font-black text-indigo-700 dark:text-indigo-300 mb-1">2. Thông tin Nhà hàng (Restaurant Business)</p>
                    <p>Bao gồm Tên quán ăn, Giờ mở cửa, Số điện thoại nhà hàng, Địa chỉ, Logo và Mô tả món ăn. Bạn có thể cập nhật trực tiếp tại trang **Thông tin Nhà hàng**.</p>
                  </div>
                </div>

                {/* Quick Link Card */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <Store className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <h4 className="font-black text-sm text-slate-950 dark:text-white">Cập nhật hồ sơ Nhà hàng</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sửa tên quán, địa chỉ, số điện thoại, giờ mở cửa & logo</p>
                    </div>
                  </div>

                  <Link
                    to="/merchant/restaurant"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md transition"
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-3.5">
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
