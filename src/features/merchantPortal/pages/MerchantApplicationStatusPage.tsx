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
      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/40 to-transparent last:hidden" />
      <div className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-xs ring-4 ring-slate-100 dark:ring-slate-800 ${done ? "bg-emerald-500 text-white shadow-emerald-500/20" : active ? "bg-cyan-500 text-slate-950 shadow-cyan-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}>
        {icon}
      </div>
      <div className="pt-1.5 min-w-0">
        <strong className={`block text-[15px] font-black tracking-tight ${done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-cyan-700 dark:text-cyan-400" : "text-slate-600 dark:text-slate-400"}`}>
          {title}
        </strong>
        <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
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
    <main className="merchant-portal-layout min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/5 dark:bg-cyan-600/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content w-full max-w-4xl mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 flex-1">
          <section className="space-y-6">
            <div>
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Application Status
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.15]">
                Trạng thái hồ sơ
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Theo dõi quá trình thẩm định quán của bạn.
              </p>
            </div>

            {isLoading && (
              <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-10 text-center shadow-xs backdrop-blur-xl">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Clock3 size={26} className="animate-pulse" />
                </div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Đang tải hồ sơ...</h2>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Vui lòng chờ trong giây lát.</p>
              </section>
            )}

            {isError && (
              <section className="relative overflow-hidden rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 p-10 text-center shadow-xs backdrop-blur-xl">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white dark:bg-slate-800 text-rose-500 border border-rose-200 dark:border-rose-800">
                  <HelpCircle size={26} />
                </div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Không tải được trạng thái</h2>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {error instanceof Error
                    ? error.message
                    : "Có lỗi xảy ra khi lấy hồ sơ."}
                </p>
              </section>
            )}

            {!isLoading && !application && (
              <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-10 text-center shadow-xs backdrop-blur-xl">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Store size={26} />
                </div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Chưa gửi hồ sơ</h2>
                <p className="mt-1 max-w-sm mx-auto text-xs font-medium text-slate-500 dark:text-slate-400">
                  Bạn chưa có hồ sơ quán nào. Hãy gửi hồ sơ để bắt đầu thẩm định.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/merchant/application/create")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2.5 text-xs font-black shadow-md shadow-cyan-500/20 transition"
                >
                  Gửi hồ sơ quán
                </button>
              </section>
            )}

            {application && (
              <>
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs backdrop-blur-xl">
                  <div className="relative flex flex-col md:flex-row items-center md:items-stretch gap-6">
                    <div className="relative h-40 w-full md:w-56 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10">
                      <img
                        src={getApplicationCoverImage(application)}
                        alt={application.name}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 rounded-full bg-slate-900/90 text-white px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-xs backdrop-blur">
                        {getStatusBadge(status)}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center py-2 min-w-0">
                      <h2 className="text-lg font-black text-slate-950 dark:text-white truncate">{application.name}</h2>

                      <div className="mt-3.5 space-y-2.5">
                        <p className="flex items-start gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <MapPin size={16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                          <span className="line-clamp-2">
                            {applicationAddress || "Địa chỉ đang chờ cập nhật"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <Mail size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="truncate">
                            {application.applicant?.email ||
                              user?.Email ||
                              "merchant@gmail.com"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <Clock3 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            Ngày gửi: {formatDate(application.createdAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs backdrop-blur-xl">
                  <h2 className="mb-6 text-base font-black tracking-tight text-slate-950 dark:text-white">Tiến trình xét duyệt</h2>

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
                      title="Bộ phận thẩm định đang kiểm tra"
                      description="Kiểm tra xem quán có thật sự đạt tiêu chí chất lượng hay không."
                      icon={<SearchCheck size={18} />}
                    />



                    <StepItem
                      active={isApproved || isRejected}
                      done={isApproved}
                      title="Nhân viên phê duyệt"
                      description="Xem xét kết quả thẩm định."
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
                      title="Hiển thị trên UGem"
                      description={getActiveDescription(isApproved)}
                      icon={<Home size={18} />}
                    />
                  </div>

                  {isRejected && (
                    <button
                      className="mt-6 w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition"
                      type="button"
                      onClick={() => navigate("/merchant/application/create")}
                    >
                      Chỉnh sửa và gửi lại hồ sơ
                    </button>
                  )}

                  {isApproved && (
                    <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10">
                      <p className="mb-4 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Quán của bạn đã được duyệt và hiển thị trên UGem. Nếu
                        cần thay đổi thông tin, vui lòng liên hệ Support.
                      </p>

                      <button
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition"
                        type="button"
                        onClick={() => navigate(portalPath)}
                      >
                        Về Merchant Portal
                      </button>
                    </div>
                  )}
                </section>

                <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/60 p-5 shadow-xs flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <User size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">Cần hỗ trợ?</h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                        Nếu bạn có thắc mắc về quá trình thẩm định, hãy nhắn cho chúng tôi.
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-4 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:border-cyan-400 transition"
                  >
                    Nhắn tin với Support
                  </button>
                </section>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function extractDescriptionLine(description: string, label: string) {
  const line = description
    .split("\n")
    .find((item) => item.trim().startsWith(`${label}:`));

  return line?.replace(`${label}:`, "").trim();
}
