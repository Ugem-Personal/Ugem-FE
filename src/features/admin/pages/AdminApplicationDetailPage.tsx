import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
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
  const parts = (name || "UGem").trim().split(/\s+/).filter(Boolean);

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

  const markerIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("thông tin ui bổ sung"),
  );
  const knownLabels = [
    "Loại hình quán",
    "Loại món chính",
    "Khoảng giá trung bình",
  ];

  const metaLines =
    markerIndex >= 0
      ? lines.slice(markerIndex + 1)
      : lines.filter((line) =>
          knownLabels.some((label) => line.startsWith(`${label}:`)),
        );
  const summaryLines =
    markerIndex >= 0
      ? lines.slice(0, markerIndex)
      : lines.filter(
          (line) => !knownLabels.some((label) => line.startsWith(`${label}:`)),
        );

  const facts = metaLines
    .map((line) => {
      const [label, ...valueParts] = line.split(":");
      return {
        label: label.trim(),
        value: valueParts.join(":").trim(),
      };
    })
    .filter((item) => item.label && item.value);

  return {
    summary: summaryLines.join("\n") || "Chưa có mô tả quán.",
    facts,
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
      description: `UGem đang tạo hồ sơ merchant cho ${name}.`,
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
          <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
            <div className="relative min-h-80 overflow-hidden bg-slate-100 dark:bg-slate-900">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={name}
                  className="h-full min-h-80 w-full object-cover"
                />
              ) : (
                <div className="grid h-full min-h-80 place-items-center bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_38%),linear-gradient(135deg,#cffafe,#ffffff,#fef3c7)] text-cyan-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_38%),linear-gradient(135deg,#0f172a,#111827,#1c1917)] dark:text-cyan-300">
                  <Store className="h-16 w-16" />
                </div>
              )}

              <div className="absolute inset-0 bg-linear-to-t from-slate-950/45 via-transparent to-transparent" />

              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-black text-slate-900 shadow-lg shadow-slate-950/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100">
                <StatusIcon className="h-4 w-4" />
                {statusMeta.label}
              </div>

              <div className="absolute bottom-5 left-5 right-5">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-950/65 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-xl">
                  Hồ sơ Merchant
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden p-6 md:p-8">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/20 blur-2xl" />
              <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-400">
                    Hồ sơ Merchant
                  </p>

                  <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
                    {name}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black shadow-sm ${statusMeta.badge}`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      {statusMeta.label}
                    </span>

                    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                      {application.type || "Merchant"}
                    </span>
                  </div>
                </div>

                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-xl shadow-slate-950/15 ring-1 ring-white/20">
                  {getInitials(name)}
                </div>
              </div>

              <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                  <CalendarClock className="mb-3 h-5 w-5 text-cyan-700 dark:text-cyan-400" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Ngày gửi</p>
                  <p className="mt-1 text-sm font-black leading-5 text-slate-950 dark:text-white">
                    {formatDate(application.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                  <ClipboardList className="mb-3 h-5 w-5 text-cyan-700 dark:text-cyan-400" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Menu</p>
                  <p className="mt-1 text-sm font-black leading-5 text-slate-950 dark:text-white">
                    {menuItems.length} món gửi kèm
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/60 dark:ring-0">
                  <Clock3 className="mb-3 h-5 w-5 text-cyan-700 dark:text-cyan-400" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Rà soát</p>
                  <p className="mt-1 text-sm font-black leading-5 text-slate-950 dark:text-white">
                    {isPendingStatus
                      ? "Chưa xử lý"
                      : formatDate(application.reviewedAt)}
                  </p>
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
                    Kiểm tra ảnh, giá, mô tả và danh mục món.
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
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/65 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  Không có menu gửi kèm.
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

            <section className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-5 shadow-sm ring-1 ring-amber-100 backdrop-blur-2xl dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    Đánh giá tiêu chí UGem (Underrated Assessment)
                  </h3>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Kiểm tra thông tin quán, menu món ăn và category để đánh giá tiêu chí "underrated" trước khi phê duyệt.
                  </p>
                </div>
              </div>
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
    </main>
  );
}
