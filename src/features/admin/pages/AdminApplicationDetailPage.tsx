import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  ImageOff,
  Loader2,
  Mail,
  Phone,
  Store,
  UserRound,
  Utensils,
  XCircle,
  ShieldCheck,
  IdCard,
  Building2,
  X,
  ZoomIn,
  UtensilsCrossed,
} from "lucide-react";
import {
  acceptApplication,
  getStaffApplicationById,
  normalizeApplication,
  rejectApplication,
} from "../services/applicationService";
import { getApplicationsQueryKey } from "../hooks/useApplications";
import type { Application } from "../types";
import { notify } from "@/shared/lib/notify";
import { UserAccountMenu } from "@/shared/components";
import { getCurrentUser } from "@/features/auth";
import { getCategories } from "@/shared/services/categoryService";
import type { Category } from "@/shared/types";
import { useSafeBack } from "@/shared/hooks/useSafeBack";

type SubmitAction = "accept" | "reject";

function formatDate(value?: string | null, fallback = "-") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1901) {
    return fallback;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Chưa nhập";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra, vui lòng thử lại.";
}

function getStatusMeta(status?: string) {
  if (status === "Approved" || status === "Accepted") {
    return {
      label: "Đã duyệt",
      icon: BadgeCheck,
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }

  if (status === "Rejected") {
    return {
      label: "Đã từ chối",
      icon: XCircle,
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
      soft: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    };
  }

  return {
    label: "Chờ duyệt",
    icon: Clock3,
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  };
}

function getInitials(name?: string) {
  const parts = (name || "UFind").trim().split(/\s+/).filter(Boolean);

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function parseApplicationDescription(description?: string) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let representativeName = "";
  let idCardNumber = "";
  let idCardFrontUrl = "";
  let idCardBackUrl = "";
  let businessLicenseNumber = "";
  let businessLicenseUrl = "";
  let storePhoto2Url = "";

  const cleanSummaryLines: string[] = [];
  const facts: { label: string; value: string }[] = [];

  let inLegalSection = false;

  for (const line of lines) {
    if (line.includes("THÔNG TIN PHÁP LÝ") || line.includes("KYC")) {
      inLegalSection = true;
      continue;
    }
    if (line.startsWith("Người đại diện:")) {
      representativeName = line.replace("Người đại diện:", "").trim();
      continue;
    }
    if (line.startsWith("Số CCCD:")) {
      idCardNumber = line.replace("Số CCCD:", "").trim();
      continue;
    }
    if (line.startsWith("CCCD Mặt trước:")) {
      idCardFrontUrl = line.replace("CCCD Mặt trước:", "").trim();
      continue;
    }
    if (line.startsWith("CCCD Mặt sau:")) {
      idCardBackUrl = line.replace("CCCD Mặt sau:", "").trim();
      continue;
    }
    if (line.startsWith("Mã số GPKD:")) {
      businessLicenseNumber = line.replace("Mã số GPKD:", "").trim();
      continue;
    }
    if (line.startsWith("Giấy phép KD:")) {
      businessLicenseUrl = line.replace("Giấy phép KD:", "").trim();
      continue;
    }
    if (line.startsWith("Ảnh không gian quán:")) {
      storePhoto2Url = line.replace("Ảnh không gian quán:", "").trim();
      continue;
    }

    if (line.includes(":") && !inLegalSection) {
      const [label, ...rest] = line.split(":");
      facts.push({ label: label.trim(), value: rest.join(":").trim() });
    } else if (!inLegalSection) {
      cleanSummaryLines.push(line);
    }
  }

  return {
    summary: cleanSummaryLines.join("\n") || "Chưa có mô tả quán.",
    facts,
    legalDocs: {
      representativeName,
      idCardNumber,
      idCardFrontUrl,
      idCardBackUrl,
      businessLicenseNumber,
      businessLicenseUrl,
      storePhoto2Url,
      hasLegalDocs: Boolean(
        idCardFrontUrl || idCardBackUrl || businessLicenseUrl || representativeName,
      ),
    },
  };
}

function isGuidLike(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  );
}

type ApplicationDetailPageProps = {
  basePath?: string;
  fallbackName?: string;
  canReview?: boolean;
  embedded?: boolean;
};

export default function AdminApplicationDetailPage({
  basePath = "/staff/applications",
  fallbackName = "Staff",
  canReview = true,
  embedded = false,
}: ApplicationDetailPageProps) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const handleBack = useSafeBack(basePath);
  const queryClient = useQueryClient();
  const currentUserRole = getCurrentUser()?.Role;
  const applicationsQueryKey = getApplicationsQueryKey(currentUserRole);

  const stateApplication = location.state?.application as
    | Application
    | undefined;
  const { data: application, isLoading: isLoadingApplication } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getStaffApplicationById(id ?? ""),
    enabled: Boolean(id),
    initialData: stateApplication
      ? normalizeApplication(stateApplication)
      : undefined,
  });

  const [reason, setReason] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [submittingAction, setSubmittingAction] = useState<SubmitAction | null>(
    null,
  );
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [checkMap, setCheckMap] = useState(false);
  const [checkStorefront, setCheckStorefront] = useState(false);
  const [checkLegalKyc, setCheckLegalKyc] = useState(false);

  const descriptionInfo = useMemo(
    () => parseApplicationDescription(application?.description),
    [application?.description],
  );
  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => {
        console.error("Không tải được danh mục:", error);
      });
  }, []);

  if (isLoadingApplication) {
    return (
      <main
        className={
          embedded
            ? "grid min-h-72 place-items-center"
            : "grid min-h-dvh place-items-center bg-slate-50 px-4 py-10 dark:bg-slate-950"
        }
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm font-bold text-slate-700 shadow-lg dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-700" />
          Đang tải dữ liệu hồ sơ...
        </div>
      </main>
    );
  }

  if (!application) {
    return (
      <main
        className={
          embedded
            ? "relative min-h-72 overflow-hidden"
            : "relative min-h-dvh overflow-hidden bg-slate-50 px-4 py-10 dark:bg-slate-950"
        }
      >
        {!embedded ? (
          <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-0" />
        ) : null}

        {!embedded ? (
          <div className="relative mx-auto mb-5 flex max-w-xl justify-end">
            <UserAccountMenu fallbackName={fallbackName} />
          </div>
        ) : null}

        <section className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-8 text-center shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />

          <div className="relative">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-700 shadow-lg shadow-amber-900/10 ring-1 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900">
              <FileText className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-black text-slate-950 dark:text-white">
              Không có dữ liệu hồ sơ
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Hãy quay lại danh sách và mở lại hồ sơ cần duyệt.
            </p>

            <button
              type="button"
              onClick={handleBack}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </button>
          </div>
        </section>
      </main>
    );
  }

  const name = application.name || "Không tên";
  const statusMeta = getStatusMeta(application.status);
  const StatusIcon = statusMeta.icon;
  const isPendingStatus =
    !application.status || application.status.toLowerCase() === "pending";
  const menuItems = application.applicationMenus ?? [];
  const heroImage =
    application.logoUrl?.trim() ||
    menuItems.find((item) => item.imageUrl?.trim())?.imageUrl;
  const applicant = application.applicant;
  const submitting = submittingAction !== null;

  function getCategoryLabel(category?: string) {
    const trimmedCategory = category?.trim();
    if (!trimmedCategory) return "";

    return categoryNameById.get(trimmedCategory) ?? trimmedCategory;
  }

  async function refreshApplicationsCache(nextStatus: "Approved" | "Rejected") {
    const reviewedAt = new Date().toISOString();

    queryClient.setQueryData<Application[]>(applicationsQueryKey, (current) =>
      current?.map((item) =>
        item.id === id ? { ...item, status: nextStatus, reviewedAt } : item,
      ),
    );

    await queryClient.invalidateQueries({
      queryKey: applicationsQueryKey,
    });
  }

  async function handleAccept() {
    if (!id || !isPendingStatus) return;

    const toastId = notify.loading("Đang duyệt hồ sơ...", {
      description: `UFind đang tạo hồ sơ merchant cho ${name}.`,
    });

    setSubmittingAction("accept");

    try {
      await acceptApplication(id);
      notify.success("Duyệt hồ sơ thành công", {
        id: toastId,
        description: `${name} đã được chuyển sang trạng thái merchant.`,
      });
      await refreshApplicationsCache("Approved");
      navigate(basePath);
    } catch (error) {
      console.error(error);
      notify.error("Duyệt hồ sơ thất bại", {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleReject() {
    if (!id || !isPendingStatus) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      notify.error("Thiếu lý do từ chối", {
        description: "Nhập lý do rõ ràng để merchant biết cần chỉnh gì.",
      });
      return;
    }

    const toastId = notify.loading("Đang từ chối hồ sơ...", {
      description: `Đang gửi phản hồi cho ${name}.`,
    });

    setSubmittingAction("reject");

    try {
      await rejectApplication(id, trimmedReason);
      notify.success("Đã từ chối hồ sơ", {
        id: toastId,
        description: "Lý do từ chối đã được ghi nhận.",
      });
      await refreshApplicationsCache("Rejected");
      navigate(basePath);
    } catch (error) {
      console.error(error);
      notify.error("Từ chối hồ sơ thất bại", {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <main
      className={
        embedded
          ? "relative min-w-0 overflow-hidden text-slate-900 dark:text-slate-100"
          : "relative min-h-dvh overflow-hidden bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      }
    >
      {!embedded ? (
        <>
          <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-0" />
          <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-600/10" />
          <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl dark:bg-indigo-600/10" />
        </>
      ) : null}

      <div className="relative w-full">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          {!embedded ? <UserAccountMenu fallbackName={fallbackName} /> : null}
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
              {/* Khung ảnh quán chuẩn tỷ lệ 16:10, bo góc đẹp, có nút phóng to */}
              <div className="relative shrink-0 group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950/60 w-full lg:w-84 aspect-[16/10] flex items-center justify-center shadow-lg">
                {heroImage ? (
                  <>
                    <img
                      src={heroImage}
                      alt={name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() =>
                        setLightboxImage({
                          src: heroImage,
                          title: `Ảnh thực tế quán: ${name}`,
                        })
                      }
                    />
                    <div
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold cursor-pointer"
                      onClick={() =>
                        setLightboxImage({
                          src: heroImage,
                          title: `Ảnh thực tế quán: ${name}`,
                        })
                      }
                    >
                      <ZoomIn className="h-4 w-4" /> Phóng to xem ảnh gốc
                    </div>
                  </>
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_38%),linear-gradient(135deg,#cffafe,#ffffff,#fef3c7)] text-cyan-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_38%),linear-gradient(135deg,#0f172a,#111827,#1c1917)] dark:text-cyan-300">
                    <Store className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Thông tin hồ sơ quán */}
              <div className="flex-1 min-w-0 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">
                    <span>Hồ sơ Merchant</span>
                    <span>•</span>
                    <span>{application.restaurantType || application.type || "Quán ăn / Đồ uống"}</span>
                  </div>

                  <h1 className="mt-2 break-words text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                    {name}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${statusMeta.badge}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </span>

                    {application.applicant?.phoneNumber && (
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                        {application.applicant.phoneNumber}
                      </span>
                    )}

                    {application.applicant?.email && (
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                        {application.applicant.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 cards tóm tắt thông tin */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-2">
                  <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5 shadow-sm ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarClock className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ngày gửi</span>
                    </div>
                    <p className="text-sm font-black leading-5 text-slate-950 dark:text-white">
                      {formatDate(application.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5 shadow-sm ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UtensilsCrossed className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Loại hình quán</span>
                    </div>
                    <p className="text-sm font-black leading-5 text-slate-950 dark:text-white truncate">
                      {application.restaurantType || "Quán ăn / Đồ uống"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5 shadow-sm ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock3 className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rà soát</span>
                    </div>
                    <p className="text-sm font-black leading-5 text-slate-950 dark:text-white">
                      {isPendingStatus
                        ? "Chưa xử lý"
                        : formatDate(application.reviewedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_370px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                    Tổng quan hồ sơ
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Thông tin merchant gửi để staff thẩm định.
                  </p>
                </div>
              </div>

              <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
                {descriptionInfo.summary}
              </p>

              {descriptionInfo.facts.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {descriptionInfo.facts.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-900/70 dark:bg-cyan-950/35"
                    >
                      <p className="truncate text-xs font-bold text-cyan-700 dark:text-cyan-400">
                        {item.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-slate-950 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* HỒ SƠ PHÁP LÝ & ĐỊNH DANH (BẮT BUỘC DUYỆT) */}
            <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                      Hồ sơ pháp lý &amp; Định danh (KYC)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Đối chiếu CCCD với Giấy phép KD để đảm bảo trách nhiệm pháp lý.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 px-3 py-1 text-xs font-black">
                  Trọng tâm thẩm định
                </span>
              </div>

              {/* Thông tin người đại diện */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block">Họ và tên người đại diện:</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {descriptionInfo.legalDocs.representativeName || applicant?.fullName || "Chưa ghi nhận"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block">Số CCCD / CMND:</span>
                  <span className="text-sm font-mono font-bold text-cyan-700 dark:text-cyan-400 mt-0.5 block">
                    {descriptionInfo.legalDocs.idCardNumber || "Xem trực tiếp trên ảnh CCCD"}
                  </span>
                </div>
                {descriptionInfo.legalDocs.businessLicenseNumber && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Số GPKD / Mã số thuế:</span>
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                      {descriptionInfo.legalDocs.businessLicenseNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid các ảnh tài liệu pháp lý */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Ảnh mặt trước CCCD */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-cyan-600" /> CCCD Mặt trước
                  </span>
                  {descriptionInfo.legalDocs.idCardFrontUrl ? (
                    <div
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 aspect-[16/10] bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition"
                      onClick={() =>
                        setLightboxImage({
                          src: descriptionInfo.legalDocs.idCardFrontUrl,
                          title: "Căn cước công dân - Mặt trước",
                        })
                      }
                    >
                      <img
                        src={descriptionInfo.legalDocs.idCardFrontUrl}
                        alt="CCCD Mặt trước"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                        <ZoomIn className="h-4 w-4" /> Phóng to
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-xs text-slate-400 aspect-[16/10] flex items-center justify-center">
                      Chưa có ảnh mặt trước
                    </div>
                  )}
                </div>

                {/* Ảnh mặt sau CCCD */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-cyan-600" /> CCCD Mặt sau
                  </span>
                  {descriptionInfo.legalDocs.idCardBackUrl ? (
                    <div
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 aspect-[16/10] bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition"
                      onClick={() =>
                        setLightboxImage({
                          src: descriptionInfo.legalDocs.idCardBackUrl,
                          title: "Căn cước công dân - Mặt sau",
                        })
                      }
                    >
                      <img
                        src={descriptionInfo.legalDocs.idCardBackUrl}
                        alt="CCCD Mặt sau"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                        <ZoomIn className="h-4 w-4" /> Phóng to
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-xs text-slate-400 aspect-[16/10] flex items-center justify-center">
                      Chưa có ảnh mặt sau
                    </div>
                  )}
                </div>

                {/* Giấy phép kinh doanh */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-cyan-600" /> Giấy phép KD (GPKD)
                  </span>
                  {descriptionInfo.legalDocs.businessLicenseUrl ? (
                    <div
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 aspect-[16/10] bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-md transition"
                      onClick={() =>
                        setLightboxImage({
                          src: descriptionInfo.legalDocs.businessLicenseUrl,
                          title: "Giấy phép kinh doanh (GPKD)",
                        })
                      }
                    >
                      <img
                        src={descriptionInfo.legalDocs.businessLicenseUrl}
                        alt="Giấy phép kinh doanh"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                        <ZoomIn className="h-4 w-4" /> Phóng to
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-xs text-slate-400 aspect-[16/10] flex items-center justify-center">
                      Chưa có Giấy phép KD
                    </div>
                  )}
                </div>
              </div>

              {/* Nếu có ảnh không gian quán bổ sung */}
              {descriptionInfo.legalDocs.storePhoto2Url && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Ảnh không gian quán bổ sung:
                  </span>
                  <div
                    className="max-w-xs group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 aspect-video bg-slate-100 dark:bg-slate-800 cursor-pointer"
                    onClick={() =>
                      setLightboxImage({
                        src: descriptionInfo.legalDocs.storePhoto2Url,
                        title: "Ảnh không gian quán bổ sung",
                      })
                    }
                  >
                    <img
                      src={descriptionInfo.legalDocs.storePhoto2Url}
                      alt="Không gian quán"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                      <ZoomIn className="h-4 w-4" /> Phóng to
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900">
                  <Utensils className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                    Menu gửi kèm
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Kiểm tra ảnh, giá, mô tả và danh mục món (nếu có).
                  </p>
                </div>
              </div>

              {menuItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {menuItems.map((item, index) => (
                    <article
                      key={item.id || `${item.name}-${index}`}
                      className="group overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-lg shadow-slate-950/5 ring-1 ring-slate-950/5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/10 dark:border-white/10 dark:bg-slate-800/60 dark:ring-0"
                    >
                      {item.imageUrl ? (
                        <div className="aspect-video w-full bg-slate-50 dark:bg-slate-950/70">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="grid h-44 place-items-center bg-slate-50 px-4 text-center text-slate-400 dark:bg-slate-950/70 dark:text-slate-500">
                          <div>
                            <ImageOff className="mx-auto h-9 w-9" />
                            <p className="mt-2 text-xs font-bold">
                              Chưa có ảnh món
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-black text-slate-950 dark:text-white">
                              {item.name || `Món #${index + 1}`}
                            </p>

                            {(() => {
                              const rawCategory = item.category?.trim() ?? "";
                              const categoryLabel =
                                getCategoryLabel(rawCategory);

                              if (!categoryLabel) return null;

                              return (
                                <p className="mt-1 break-words text-xs font-bold text-cyan-700 dark:text-cyan-400">
                                  {categoryLabel}
                                  {isGuidLike(rawCategory) &&
                                    !categoryNameById.has(rawCategory) &&
                                    " (chưa map được tên)"}
                                </p>
                              );
                            })()}

                            {item.cuisine && (
                              <p className="mt-1 break-words text-xs font-bold text-amber-700 dark:text-amber-300">
                                Nền ẩm thực: {item.cuisine}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900">
                            {formatMoney(item.price)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-50/40 dark:bg-cyan-950/20 p-6 text-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Quy trình tinh gọn: Quán chưa nộp menu trước
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Chủ quán sẽ chủ động tạo Menu món ăn, hình ảnh, giá bán và cài đặt Khung giờ mở cửa trong Dashboard sau khi được duyệt.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                    Người nộp
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tài khoản gửi hồ sơ.</p>
                </div>
              </div>

              {applicant ? (
                <div className="space-y-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cyan-700 text-sm font-black text-white shadow-lg shadow-cyan-900/15">
                      {applicant.avatarUrl ? (
                        <img
                          src={applicant.avatarUrl}
                          alt={applicant.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(applicant.fullName)
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950 dark:text-white">
                        {applicant.fullName || "Chưa cập nhật"}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Merchant applicant
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <p className="flex min-w-0 items-center gap-2 break-all text-slate-700 dark:text-slate-300">
                      <Mail className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
                      <span className="min-w-0 break-all">
                        {applicant.email || "Chưa có email"}
                      </span>
                    </p>

                    <p className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
                      <span className="min-w-0 break-words">
                        {applicant.phoneNumber || "Chưa có số điện thoại"}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hồ sơ chưa có thông tin người nộp.
                </p>
              )}
            </section>

            {/* Checklist Thẩm định 3 Bước của Staff */}
            <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-50/90 to-white dark:from-cyan-950/40 dark:to-slate-900 p-5 shadow-sm ring-1 ring-cyan-500/20">
              <div className="flex items-center gap-2.5 mb-3 text-cyan-700 dark:text-cyan-300">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-black tracking-tight">
                  Checklist Thẩm định 3 Bước (Staff)
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl p-2 hover:bg-cyan-500/10 transition">
                  <input
                    type="checkbox"
                    checked={checkMap}
                    onChange={(e) => setCheckMap(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="leading-snug text-slate-700 dark:text-slate-300">
                    <strong>Bước 1:</strong> Ghim bản đồ &amp; Địa chỉ quán ngoài đời thực rõ ràng, hợp lệ.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl p-2 hover:bg-cyan-500/10 transition">
                  <input
                    type="checkbox"
                    checked={checkStorefront}
                    onChange={(e) => setCheckStorefront(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="leading-snug text-slate-700 dark:text-slate-300">
                    <strong>Bước 2:</strong> Ảnh biển hiệu / Mặt tiền có thật và khớp với tên quán đăng ký.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl p-2 hover:bg-cyan-500/10 transition">
                  <input
                    type="checkbox"
                    checked={checkLegalKyc}
                    onChange={(e) => setCheckLegalKyc(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="leading-snug text-slate-700 dark:text-slate-300">
                    <strong>Bước 3:</strong> Tên người đại diện trên CCCD trùng khớp với Giấy phép kinh doanh.
                  </span>
                </label>
              </div>

              {checkMap && checkStorefront && checkLegalKyc && (
                <div className="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4" /> Đạt đủ 3 tiêu chuẩn — Sẵn sàng phê duyệt!
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:ring-0">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                    {isPendingStatus ? "Xử lý hồ sơ" : "Kết quả xử lý"}
                  </h2>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {isPendingStatus
                      ? "Duyệt khi thông tin hợp lệ, từ chối nếu cần bổ sung."
                      : "Hồ sơ đã được xử lý và chuyển sang chế độ chỉ xem."}
                  </p>
                </div>

                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ring-1 ring-black/5 ${statusMeta.soft}`}
                >
                  <StatusIcon className="h-5 w-5" />
                </span>
              </div>

              {!canReview ? (
                <div className="rounded-2xl border border-cyan-100 dark:border-cyan-900/60 bg-cyan-50/80 dark:bg-cyan-950/40 p-4 text-sm font-semibold leading-6 text-cyan-800 dark:text-cyan-300">
                  Admin đang xem job ở chế độ quản lý. Quyền duyệt hoặc từ chối
                  hồ sơ được tách cho Staff xử lý.
                </div>
              ) : !isPendingStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-800/60">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${statusMeta.soft}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-slate-950 dark:text-white">
                        {statusMeta.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Xử lý lúc {formatDate(application.reviewedAt)}. Không thể
                        duyệt hoặc từ chối lại hồ sơ này.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Lý do từ chối
                    </span>

                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Ví dụ: Cần bổ sung ảnh món rõ hơn hoặc thông tin quán chưa đủ tin cậy..."
                      className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 py-3 text-sm leading-6 text-slate-900 dark:text-white shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                      disabled={submitting}
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleAccept}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {submittingAction === "accept" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Duyệt
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReject}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {submittingAction === "reject" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      Từ chối
                    </button>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-slate-900 border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
              <span className="font-bold text-sm">{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="rounded-full p-1.5 hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
