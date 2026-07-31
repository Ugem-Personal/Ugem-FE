import { useEffect, useMemo, useState } from "react";
import { IdCard, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import type { MerchantDetail } from "@/features/customer/types";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import { getMyMerchantDetail } from "../services";

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
      displayName: user?.Name || "Merchant",
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
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Merchant Profile
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Profile Merchant
              </h1>
              <p className="mt-3 text-[14px] font-medium text-slate-500 leading-relaxed">
                Xem thông tin tài khoản Merchant đang đăng nhập.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-multiply" />
              
              <div className="border-b border-slate-200/50 p-8 relative">
                <div className="grid place-items-center text-center">
                  <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-cyan-100 to-blue-100 text-5xl font-black text-cyan-800 shadow-lg shadow-cyan-900/10 ring-4 ring-white">
                    {getInitial(profile.displayName)}
                  </div>

                  <h2 className="mt-6 max-w-full truncate text-[22px] font-black tracking-tight text-slate-900">
                    {profile.displayName}
                  </h2>

                  <p className="mt-1.5 truncate text-[14px] font-bold text-slate-500">
                    {profile.email}
                  </p>

                  <span className="mt-5 inline-flex rounded-full border border-cyan-200/60 bg-gradient-to-r from-cyan-50/90 to-blue-50/90 px-4 py-1.5 text-[12px] font-black uppercase tracking-wider text-cyan-800 shadow-sm">
                    {profile.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-6 text-sm relative">
                <ProfileInfoRow
                  icon={ShieldCheck}
                  label="Vai trò"
                  value={profile.role}
                />
                <ProfileInfoRow
                  icon={Mail}
                  label="Email"
                  value={profile.email}
                />
                <ProfileInfoRow
                  icon={Phone}
                  label="Số điện thoại"
                  value={profile.phoneNumber}
                />
                <ProfileInfoRow
                  icon={IdCard}
                  label="User ID"
                  value={profile.userId}
                />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
              <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl mix-blend-multiply" />
              
              <div className="mb-6 flex items-start gap-4 relative">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 shadow-sm ring-1 ring-cyan-200/50">
                  <UserRound size={24} />
                </div>

                <div className="min-w-0 pt-1">
                  <h2 className="text-[18px] font-black tracking-tight text-slate-900">
                    Thông tin tài khoản
                  </h2>

                  <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-slate-500">
                    Hiện tại hệ thống chỉ hỗ trợ cập nhật hồ sơ cho Customer.
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-orange-50/90 p-5 shadow-sm">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-300/30 blur-2xl" />
                <p className="relative text-[14px] font-bold text-amber-800 leading-relaxed">
                  Nếu cần chỉnh tên/email Merchant, vui lòng liên hệ Admin để cập
                  nhật.
                </p>
              </div>
            </section>
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
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/80 hover:shadow-md">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 shadow-sm ring-1 ring-cyan-200/50">
        <Icon size={18} />
      </span>

      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>

        <p className="mt-1.5 break-all text-[14px] font-black text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}
