import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  HelpCircle,
  Home,
  Mail,
  MapPin,
  SearchCheck,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/features/auth";
import { useMyApplications } from "../hooks/useMyApplications";
import type { MerchantApplication } from "../types";
import type { MerchantDetail } from "@/features/customer/types";
import { getMyMerchantDetail } from "../services";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";

function getLatestApplication(applications: MerchantApplication[]) {
  return [...applications].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();

    return dateB - dateA;
  })[0];
}

import { cleanAddress } from "@/shared/utils/address";

function getApplicationAddress(
  application: MerchantApplication,
  merchant?: MerchantDetail | null,
) {
  const rawAddress = application.address ||
    merchant?.address ||
    extractDescriptionLine(application.description, "Địa chỉ") ||
    "Địa chỉ đang chờ cập nhật";
  return cleanAddress(rawAddress);
}

function getApplicationCoverImage(application: MerchantApplication) {
  const logoUrl = application.logoUrl?.trim();
  if (logoUrl) return logoUrl;

  const menuImage = application.applicationMenus
    ?.find((item) => item.imageUrl?.trim())
    ?.imageUrl?.trim();
  if (menuImage) return menuImage;

  return (
    application.applicant?.avatarUrl?.trim() ||
    "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=80"
  );
}

function getStatusBadge(status?: string) {
  if (isApprovedStatus(status)) return "Đã được duyệt";
  if (status === "Rejected") return "Bị từ chối";
  if (status === "Pending") return "Đang thẩm định";
  return "Chưa gửi hồ sơ";
}

function isApprovedStatus(status?: string) {
  return status === "Approved" || status === "Accepted" || status === "Accept";
}

function formatDate(value?: string) {
  if (!value) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

type StepItemProps = Readonly<{
  active?: boolean;
  done?: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
}>;

function getReviewIcon(isApproved: boolean) {
  return isApproved ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />;
}

function getResultIcon(isApproved: boolean) {
  return isApproved ? <CheckCircle2 size={18} /> : <Circle size={18} />;
}

function getResultDescription(isApproved: boolean, isRejected: boolean) {
  if (isApproved) {
    return "Hồ sơ đã được duyệt.";
  }

  if (isRejected) {
    return "Hồ sơ bị từ chối. Bạn có thể gửi lại.";
  }

  return "Thông báo chính thức về hồ sơ.";
}

function getActiveDescription(isApproved: boolean) {
  return isApproved
    ? "Quán đã sẵn sàng hiển thị cho Customer."
    : "Quán đã được hiển thị cho Customer.";
}

function StepItem({ active, done, title, description, icon }: StepItemProps) {
  return (
    <div className={`relative flex gap-5 pb-8 last:pb-0 ${active ? "opacity-100" : "opacity-60 grayscale-[50%]"} transition-all duration-300`}>
      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-cyan-200 to-transparent last:hidden" />
      <div className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-sm ring-4 ring-white ${done ? "bg-emerald-500 text-white shadow-emerald-500/30" : active ? "bg-cyan-500 text-white shadow-cyan-500/30" : "bg-slate-200 text-slate-400"}`}>
        {icon}
      </div>
      <div className="pt-1.5 min-w-0">
        <strong className={`block text-[15px] font-black tracking-tight ${done ? "text-emerald-700" : active ? "text-cyan-800" : "text-slate-600"}`}>
          {title}
        </strong>
        <p className="mt-1 text-[13px] font-medium text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export function MerchantApplicationStatusPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const portalPath =
    user?.Role === "Customer" || user?.Role === "Reviewer"
      ? "/customer"
      : "/merchant";
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(
    null,
  );

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
  } = useMyApplications();

  let application = getLatestApplication(applications);
  const status = application?.status;

  const isPending = status === "Pending";
  const isApproved = isApprovedStatus(status);
  const isRejected = status === "Rejected";
  const applicationAddress = application
    ? getApplicationAddress(application, merchantDetail)
    : "";

  if (
    application &&
    applicationAddress &&
    !extractDescriptionLine(application.description, "Địa chỉ")
  ) {
    application = {
      ...application,
      description: `Địa chỉ: ${applicationAddress}\n${application.description}`,
    };
  }

  useEffect(() => {
    let active = true;

    const loadMerchant = async () => {
      try {
        const data = await getMyMerchantDetail();

        if (active) {
          setMerchantDetail(data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (isApproved) {
      queueMicrotask(() => {
        void loadMerchant();
      });
    }

    return () => {
      active = false;
    };
  }, [isApproved]);

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content max-w-4xl mx-auto">
          <section className="space-y-8">
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Application Status
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Trạng thái hồ sơ
              </h1>
              <p className="mt-3 text-[14px] font-medium text-slate-500 leading-relaxed">
                Theo dõi quá trình thẩm định quán của bạn.
              </p>
            </div>

            {isLoading && (
              <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[20px] bg-cyan-50 text-cyan-600 shadow-sm ring-1 ring-cyan-100">
                  <Clock3 size={28} className="animate-pulse" />
                </div>
                <h2 className="text-[18px] font-black text-slate-900">Đang tải hồ sơ...</h2>
                <p className="mt-2 text-[14px] font-medium text-slate-500">Vui lòng chờ trong giây lát.</p>
              </section>
            )}

            {isError && (
              <section className="relative overflow-hidden rounded-[32px] border border-rose-200/60 bg-rose-50/60 p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[20px] bg-white text-rose-500 shadow-sm ring-1 ring-rose-200">
                  <HelpCircle size={28} />
                </div>
                <h2 className="text-[18px] font-black text-slate-900">Không tải được trạng thái</h2>
                <p className="mt-2 text-[14px] font-medium text-slate-500">
                  {error instanceof Error
                    ? error.message
                    : "Có lỗi xảy ra khi lấy hồ sơ."}
                </p>
              </section>
            )}

            {!isLoading && !application && (
              <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-600 shadow-sm ring-1 ring-cyan-200">
                  <Store size={28} />
                </div>
                <h2 className="text-[18px] font-black text-slate-900">Chưa gửi hồ sơ</h2>
                <p className="mt-2 max-w-sm mx-auto text-[14px] font-medium text-slate-500">
                  Bạn chưa có hồ sơ quán nào. Hãy gửi hồ sơ để bắt đầu thẩm định.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/merchant/application/create")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                >
                  Gửi hồ sơ quán
                </button>
              </section>
            )}

            {application && (
              <>
                <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 hover:opacity-100 mix-blend-multiply" />
                  <div className="relative flex flex-col md:flex-row items-center md:items-stretch gap-6">
                    <div className="relative h-40 w-full md:w-56 shrink-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                      <img
                        src={getApplicationCoverImage(application)}
                        alt={application.name}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-800 shadow-sm backdrop-blur">
                        {getStatusBadge(status)}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center py-2 min-w-0">
                      <h2 className="text-[20px] font-black text-slate-900 truncate">{application.name}</h2>

                      <div className="mt-4 space-y-3">
                        <p className="flex items-start gap-2.5 text-[14px] font-medium text-slate-600">
                          <MapPin size={18} className="mt-0.5 shrink-0 text-cyan-600" />
                          <span className="line-clamp-2">
                            {applicationAddress || "Địa chỉ đang chờ cập nhật"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2.5 text-[14px] font-medium text-slate-600">
                          <Mail size={18} className="shrink-0 text-amber-600" />
                          <span className="truncate">
                            {application.applicant?.email ||
                              user?.Email ||
                              "merchant@gmail.com"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2.5 text-[14px] font-medium text-slate-600">
                          <Clock3 size={18} className="shrink-0 text-emerald-600" />
                          <span>
                            Ngày gửi: {formatDate(application.createdAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
                  <h2 className="mb-8 text-[18px] font-black tracking-tight text-slate-900">Tiến trình xét duyệt</h2>

                  <div className="relative">
                    <StepItem
                      done
                      title="Đã gửi hồ sơ"
                      description="Hồ sơ quán đã được gửi lên hệ thống."
                      icon={<CheckCircle2 size={18} />}
                    />

                    <StepItem
                      active={isPending}
                      done={isApproved || isRejected}
                      title="Censor đang thẩm định"
                      description="Censor kiểm tra xem quán có thật sự underrated hay không."
                      icon={<SearchCheck size={18} />}
                    />

                    <div className="ml-14 mb-8 inline-flex rounded-xl border border-cyan-200/50 bg-cyan-50/50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm relative z-10">
                      ƯỚC TÍNH: 1–2 NGÀY LÀM VIỆC
                    </div>

                    <StepItem
                      active={isApproved || isRejected}
                      done={isApproved}
                      title="Chờ Staff phê duyệt"
                      description="Staff xem xét kết quả thẩm định."
                      icon={getReviewIcon(isApproved)}
                    />

                    <StepItem
                      active={isApproved || isRejected}
                      done={isApproved}
                      title="Kết quả xét duyệt"
                      description={getResultDescription(isApproved, isRejected)}
                      icon={getResultIcon(isApproved)}
                    />

                    <StepItem
                      active={isApproved}
                      done={isApproved}
                      title="Active trên UGem"
                      description={getActiveDescription(isApproved)}
                      icon={<Home size={18} />}
                    />
                  </div>

                  {isRejected && (
                    <button
                      className="mt-8 w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                      type="button"
                      onClick={() => navigate("/merchant/application/create")}
                    >
                      Chỉnh sửa và gửi lại hồ sơ
                    </button>
                  )}

                  {isApproved && (
                    <div className="mt-8 pt-6 border-t border-slate-200/50">
                      <p className="mb-5 text-[14px] font-medium text-slate-600 leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        Quán của bạn đã được duyệt và hiển thị trên UGem. Nếu
                        cần thay đổi thông tin, vui lòng liên hệ Support.
                      </p>

                      <button
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/30 active:scale-[0.98]"
                        type="button"
                        onClick={() => navigate(portalPath)}
                      >
                        Về Merchant Portal
                      </button>
                    </div>
                  )}
                </section>

                <section className="relative overflow-hidden rounded-[24px] border border-cyan-200/50 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-5 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-cyan-600 shadow-sm ring-1 ring-cyan-100">
                      <User size={20} />
                    </div>

                    <div>
                      <h3 className="text-[16px] font-black text-slate-900">Cần hỗ trợ?</h3>
                      <p className="mt-1 text-[13px] font-medium text-slate-600">
                        Nếu bạn có thắc mắc về quá trình thẩm định, hãy nhắn cho
                        chúng tôi.
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-black text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border border-cyan-100"
                  >
                    Nhắn tin với Support
                  </button>
                </section>
              </>
            )}
          </section>
        </div>
      </section>

      {/* Mobile nav removed for Promax layout to use modern bottom navigation if applicable */}
    </main>
  );
}

function extractDescriptionLine(description: string, label: string) {
  const line = description
    .split("\n")
    .find((item) => item.trim().startsWith(`${label}:`));

  return line?.replace(`${label}:`, "").trim();
}
