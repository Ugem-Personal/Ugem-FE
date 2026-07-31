import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useStaffApplications } from "../hooks/useApplications";
import type { Application } from "../types";
import { UserAccountMenu } from "@/shared/components";
import { notify } from "@/shared/lib/notify";

type NormalizedStatus = "pending" | "approved" | "rejected";

function formatDate(value?: string | number | null, fallback = "-") {
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

function getTimeValue(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeStatus(status?: string): NormalizedStatus {
  const value = status?.toLowerCase();

  if (value === "approved" || value === "accepted") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

function getStatusMeta(status?: string) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "approved") {
    return {
      label: "Đã duyệt",
      icon: CheckCircle2,
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (normalizedStatus === "rejected") {
    return {
      label: "Đã từ chối",
      icon: XCircle,
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "Đang duyệt",
    icon: Clock3,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100",
  };
}

function sortPending(applications: Application[]) {
  return [...applications].sort(
    (a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt),
  );
}

function sortReviewed(applications: Application[]) {
  return [...applications].sort((a, b) => {
    const bTime =
      getTimeValue(b.reviewedAt) ||
      getTimeValue(b.updatedAt) ||
      getTimeValue(b.createdAt);
    const aTime =
      getTimeValue(a.reviewedAt) ||
      getTimeValue(a.updatedAt) ||
      getTimeValue(a.createdAt);

    return bTime - aTime;
  });
}

function ApplicationTable({
  applications,
  emptyText,
  basePath,
  canReview,
}: {
  applications: Application[];
  emptyText: string;
  basePath: string;
  canReview: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-190">
        <thead className="bg-cyan-50/70 text-left text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
          <tr>
            <th className="px-5 py-4">Tên quán</th>
            <th className="px-5 py-4">Trạng thái</th>
            <th className="px-5 py-4">Ngày gửi</th>
            <th className="px-5 py-4">Ngày xử lý</th>
            <th className="px-5 py-4 text-right">Hành động</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100/80">
          {applications.map((app) => {
            const statusMeta = getStatusMeta(app.status);
            const StatusIcon = statusMeta.icon;
            const isPending = normalizeStatus(app.status) === "pending";

            return (
              <tr key={app.id} className="group transition hover:bg-cyan-50/50">
                <td className="px-5 py-4">
                  <p className="max-w-72 truncate font-black text-slate-950">
                    {app.name || "Không tên"}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black shadow-sm ring-1 ${statusMeta.badgeClass}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {statusMeta.label}
                  </span>
                </td>

                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {formatDate(app.createdAt)}
                </td>

                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {isPending ? "Chưa xử lý" : formatDate(app.reviewedAt)}
                </td>

                <td className="px-5 py-4 text-right">
                  <Link
                    to={`${basePath}/${app.id}`}
                    state={{ application: app }}
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-cyan-700"
                  >
                    {isPending && canReview ? "Xem và duyệt" : "Xem chi tiết"}
                  </Link>
                </td>
              </tr>
            );
          })}

          {applications.length === 0 && (
            <tr>
              <td className="px-6 py-14 text-center" colSpan={5}>
                <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8">
                  <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    {emptyText}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type ApplicationsPageProps = {
  basePath?: string;
  title?: string;
  subtitle?: string;
  fallbackName?: string;
  canReview?: boolean;
  backTo?: string;
  backLabel?: string;
  secondaryAction?: ReactNode;
  initialTab?: ApplicationTab;
  showTabs?: boolean;
  embedded?: boolean;
};

type ApplicationTab = "pending" | "reviewed";

export default function AdminApplicationsPage({
  basePath = "/staff/applications",
  title = "Job duyệt hồ sơ Merchant",
  subtitle = "Hàng đợi hồ sơ merchant cần Staff kiểm tra và xử lý.",
  fallbackName = "Staff",
  canReview = true,
  backTo,
  backLabel = "Back",
  secondaryAction,
  initialTab = "pending",
  showTabs = true,
  embedded = false,
}: ApplicationsPageProps) {
  const [selectedTab, setSelectedTab] = useState<ApplicationTab>(initialTab);
  const activeTab = showTabs ? selectedTab : initialTab;

  const {
    data: applications = [],
    dataUpdatedAt,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStaffApplications();

  const groupedApplications = useMemo(() => {
    const pending: Application[] = [];
    const reviewed: Application[] = [];

    for (const application of applications) {
      if (normalizeStatus(application.status) === "pending") {
        pending.push(application);
      } else {
        reviewed.push(application);
      }
    }

    return {
      pending: sortPending(pending),
      reviewed: sortReviewed(reviewed),
    };
  }, [applications]);

  const tabItems = useMemo(
    () => [
      {
        key: "pending" as const,
        label: "Chờ duyệt",
        description: "Pending và hồ sơ chưa ai nhận xử lý",
        count: groupedApplications.pending.length,
      },
      {
        key: "reviewed" as const,
        label: "Đã duyệt",
        description: "Hồ sơ đã được duyệt hoặc từ chối",
        count: groupedApplications.reviewed.length,
      },
    ],
    [groupedApplications.pending.length, groupedApplications.reviewed.length],
  );

  const activeTabMeta =
    tabItems.find((item) => item.key === activeTab) ?? tabItems[0];

  const activeApplications =
    activeTab === "pending"
      ? groupedApplications.pending
      : groupedApplications.reviewed;

  const activeEmptyText =
    activeTab === "pending"
      ? "Chưa có hồ sơ đang chờ duyệt."
      : "Chưa có hồ sơ đã xử lý.";

  const ActiveTabIcon = activeTab === "pending" ? Clock3 : CheckCircle2;

  const handleRefresh = () => {
    void refetch();
  };

  useEffect(() => {
    if (isError) {
      notify.error(
        "Không tải được danh sách hồ sơ: " + (error as Error)?.message,
      );
    }
  }, [isError, error]);

  return (
    <div
      className={
        embedded
          ? "text-slate-950"
          : "relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 py-6 text-slate-950"
      }
    >
      {!embedded && (
        <>
          <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
        </>
      )}

      <div className={embedded ? "w-full" : "relative mx-auto max-w-6xl"}>
        <div
          className={`${embedded ? "mb-3" : "mb-5"} flex flex-wrap items-center justify-between gap-3`}
        >
          <div className="min-w-0">
            <div
              className={`${embedded ? "mb-2 text-[10px] tracking-[0.15em]" : "mb-3 text-[11px] tracking-[0.18em]"} inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 font-black uppercase text-cyan-700 shadow-sm shadow-cyan-950/5`}
            >
              Merchant Review
            </div>

            <h1
              className={`${embedded ? "text-2xl" : "text-3xl"} break-words font-black tracking-tight text-slate-950`}
            >
              {title}
            </h1>

            <p
              className={`${embedded ? "mt-0.5 text-xs leading-5" : "mt-1 text-sm leading-6"} text-slate-600`}
            >
              {subtitle}
            </p>

            <p
              className={`${embedded ? "mt-0.5" : "mt-1"} text-xs font-semibold text-slate-500`}
            >
              Cập nhật lần cuối: {formatDate(dataUpdatedAt, "Chưa tải")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {backTo ? (
              <Link
                to={backTo}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-2.5 text-sm font-black text-slate-700 shadow-lg shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            ) : null}

            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
              {isRefetching ? "Đang tải..." : "Làm mới"}
            </button>

            {secondaryAction}
            {!embedded ? <UserAccountMenu fallbackName={fallbackName} /> : null}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 w-72 animate-pulse rounded-2xl bg-white/70" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-3xl bg-white/70 shadow-lg shadow-slate-950/5"
                />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/85 p-8 text-center shadow-2xl shadow-rose-950/5 ring-1 ring-rose-100 backdrop-blur-xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-rose-700 shadow-sm">
              <XCircle className="h-7 w-7" />
            </div>

            <h3 className="mb-2 text-lg font-black text-rose-800">
              Không tải được dữ liệu
            </h3>

            <p className="mb-5 text-sm font-semibold text-rose-700">
              {error?.message || "Lỗi không xác định"}
            </p>

            <button
              onClick={handleRefresh}
              className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-900/15 transition hover:-translate-y-0.5 hover:bg-rose-700"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className={embedded ? "space-y-4" : "space-y-5"}>
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="relative overflow-hidden border-b border-white/70 p-5">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
                <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-amber-300/25 blur-2xl" />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight text-slate-950">
                      Danh sách hồ sơ merchant
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {showTabs
                        ? "Chuyển tab để xem hồ sơ đang chờ Staff nhận xử lý hoặc hồ sơ đã duyệt."
                        : "Theo dõi nhóm hồ sơ đang chọn từ sidebar bên trái."}
                    </p>
                  </div>

                  {showTabs ? (
                    <div className="inline-flex w-full rounded-2xl bg-slate-100/80 p-1 text-sm font-black text-slate-600 shadow-inner sm:w-auto">
                      {tabItems.map((item) => {
                        const isActive = activeTab === item.key;

                        return (
                          <button
                            key={item.key}
                            onClick={() => setSelectedTab(item.key)}
                            className={`flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 transition sm:flex-none ${
                              isActive
                                ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                                : "text-slate-600 hover:bg-white hover:text-slate-950"
                            }`}
                          >
                            {item.label}

                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "bg-white text-slate-500"
                              }`}
                            >
                              {item.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ring-1 ring-black/5 ${
                      activeTab === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <ActiveTabIcon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <h3 className="truncate font-black text-slate-950">
                      {activeTabMeta.label}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {activeTabMeta.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-sm font-black tabular-nums shadow-sm ${
                    activeTab === "pending"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {activeTabMeta.count} hồ sơ
                </span>
              </div>

              <ApplicationTable
                applications={activeApplications}
                emptyText={activeEmptyText}
                basePath={basePath}
                canReview={canReview}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
