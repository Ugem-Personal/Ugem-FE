import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Hourglass,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import {
  getReviewerApplications,
  acceptReviewerApplication,
  rejectReviewerApplication,
  type ReviewerApplication,
} from "../services/staffService";
import { StaffShell } from "../components/StaffShell";

type ReviewerApp = ReviewerApplication;

type StaffReviewerApplicationsPageProps = {
  shell?: "staff" | "admin";
  fallbackName?: string;
  canReview?: boolean;
  backTo?: string;
  backLabel?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function StatusBadge({ status }: { status?: string }) {
  const v = status?.toLowerCase();
  if (v === "accept" || v === "accepted" || v === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-sm">
        <BadgeCheck className="h-3.5 w-3.5" />
        Đã duyệt
      </span>
    );
  }
  if (v === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 shadow-sm">
        <XCircle className="h-3.5 w-3.5" />
        Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 shadow-sm">
      <Hourglass className="h-3.5 w-3.5" />
      Chờ duyệt
    </span>
  );
}

function isApprovedStatus(status?: string) {
  const v = status?.toLowerCase();
  return v === "accept" || v === "accepted" || v === "approved";
}

function isRejectedStatus(status?: string) {
  return status?.toLowerCase() === "rejected";
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  tone: "violet" | "amber" | "emerald" | "rose";
}) {
  const toneClass = {
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  }[tone];

  return (
    <article className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

const REVIEWER_APPS_QK = ["reviewer-applications", "staff"] as const;

export default function StaffReviewerApplicationsPage({
  shell = "staff",
  canReview = true,
}: StaffReviewerApplicationsPageProps) {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    reason: string;
  } | null>(null);

  const {
    data: apps = [],
    isLoading,
    isError,
    isFetching,
  } = useQuery<ReviewerApp[]>({
    queryKey: REVIEWER_APPS_QK,
    queryFn: async () => {
      const result = await getReviewerApplications();
      // BE trả về paginated: { items: [...], totalItems, pageSize, pageIndex }
      if (result && typeof result === "object" && "items" in result) {
        return (
          ((result as Record<string, unknown>).items as ReviewerApp[]) ?? []
        );
      }
      return Array.isArray(result) ? (result as ReviewerApp[]) : [];
    },
    staleTime: 1000 * 60,
  });

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: REVIEWER_APPS_QK });

  const handleAccept = async (id: string) => {
    setProcessing(id);
    try {
      await acceptReviewerApplication(id);
      notify.success("Đã chấp thuận đơn Reviewer.");
      refresh();
    } catch {
      notify.error("Không thể chấp thuận đơn này.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectModal.reason.trim()) {
      notify.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    setProcessing(rejectModal.id);
    try {
      await rejectReviewerApplication(rejectModal.id, rejectModal.reason);
      notify.success("Đã từ chối đơn Reviewer.");
      setRejectModal(null);
      refresh();
    } catch {
      notify.error("Không thể từ chối đơn này.");
    } finally {
      setProcessing(null);
    }
  };

  const pending = apps.filter(
    (a) => !a.status || a.status.toLowerCase() === "pending",
  );
  const reviewed = apps.filter(
    (a) => a.status && a.status.toLowerCase() !== "pending",
  );
  const approvedCount = apps.filter((app) => isApprovedStatus(app.status)).length;
  const rejectedCount = apps.filter((app) => isRejectedStatus(app.status)).length;
  const reviewerContent: ReactNode = (
    <>
      <div className="relative">
        <div className="mb-5 overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
          <div className="pointer-events-none absolute right-8 top-6 h-32 w-32 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Reviewer Applications
            </div>
            <h1 className="wrap-break-word text-3xl font-black tracking-tight text-slate-950">
              Đơn đăng ký Reviewer
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Xét duyệt đơn đăng ký làm Reviewer từ các Customer.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isFetching}
              onClick={refresh}
              className="h-10 gap-2 rounded-2xl border-white/70 bg-white/80 px-4 font-black shadow-sm ring-1 ring-slate-950/5"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Đang tải..." : "Làm mới"}
            </Button>

          </div>
          </div>
        </div>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={UsersRound} label="Tổng đơn" value={apps.length} tone="violet" />
          <StatCard icon={Hourglass} label="Chờ duyệt" value={pending.length} tone="amber" />
          <StatCard icon={BadgeCheck} label="Đã duyệt" value={approvedCount} tone="emerald" />
          <StatCard icon={XCircle} label="Từ chối" value={rejectedCount} tone="rose" />
        </section>

        {isError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            Không tải được danh sách đơn Reviewer. Vui lòng thử lại.
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-xl shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                <Hourglass className="h-3.5 w-3.5" />
                Chờ duyệt ({pending.length})
              </p>
              {pending.length === 0 ? (
                <p className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-950/5">
                  Không có đơn nào đang chờ duyệt.
                </p>
              ) : (
                <div className="space-y-3">
                  {pending.map((app) => (
                    <ReviewerAppCard
                      key={app.id}
                      app={app}
                      processing={processing}
                      readOnly={!canReview}
                      onAccept={canReview ? handleAccept : undefined}
                      onReject={
                        canReview
                          ? (id) => setRejectModal({ id, reason: "" })
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-xl shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                <BadgeCheck className="h-3.5 w-3.5" />
                Đã xử lý ({reviewed.length})
              </p>
              {reviewed.length === 0 ? (
                <p className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-950/5">
                  Chưa có đơn nào được xử lý.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviewed.map((app) => (
                    <ReviewerAppCard
                      key={app.id}
                      app={app}
                      processing={processing}
                      readOnly
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {canReview && rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-2xl ring-1 ring-slate-950/5 backdrop-blur-2xl">
            <div className="border-b border-white/70 p-6">
              <h2 className="text-xl font-black text-slate-950">
                Lý do từ chối
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Nhập lý do để Customer biết đơn của họ chưa đạt.
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal({ ...rejectModal, reason: e.target.value })
                }
                rows={4}
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-950/5 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
                placeholder="Ví dụ: Thông tin chưa đầy đủ, chưa có kinh nghiệm thực tế..."
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-white/70 p-4">
              <Button
                variant="outline"
                onClick={() => setRejectModal(null)}
                className="rounded-2xl"
              >
                Huỷ
              </Button>
              <Button
                onClick={() => void handleReject()}
                disabled={!!processing}
                className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (shell === "staff") {
    return (
      <StaffShell activeItem="reviewer-applications">
        {reviewerContent}
      </StaffShell>
    );
  }

  return (
    <div className="app-page relative overflow-hidden px-4 py-6">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <main className="relative mx-auto max-w-6xl">{reviewerContent}</main>
    </div>
  );
}

function ReviewerAppCard({
  app,
  processing,
  readOnly = false,
  onAccept,
  onReject,
}: {
  app: ReviewerApp;
  processing: string | null;
  readOnly?: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const id = app.id ?? "";
  const isProcessing = processing === id;

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/85 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-lg shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-950/10">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-violet-500 via-cyan-500 to-emerald-400" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-300/15 blur-2xl transition group-hover:bg-violet-300/25" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-violet-100 dark:ring-violet-900">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="break-all text-sm font-black text-slate-950 dark:text-white">
              Customer ID: {app.customerId ?? "-"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
              Gửi lúc {formatDate(app.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.motivation && (
        <p className="relative mt-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <span className="font-black text-slate-800 dark:text-white">Động lực: </span>
          {app.motivation}
        </p>
      )}

      {app.rejectionReason && (
        <p className="relative mt-2 rounded-2xl border border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          Lý do từ chối: {app.rejectionReason}
        </p>
      )}

      <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {app.facebookUrl && (
          <a
            href={app.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-blue-700 dark:text-blue-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/60"
          >
            Facebook ↗
          </a>
        )}
        {app.tiktokUrl && (
          <a
            href={app.tiktokUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 text-slate-700 dark:text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            TikTok ↗
          </a>
        )}
        {app.youtubeUrl && (
          <a
            href={app.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-rose-700 dark:text-rose-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60"
          >
            YouTube ↗
          </a>
        )}
        {app.otherSocialUrl && (
          <a
            href={app.otherSocialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 text-slate-600 dark:text-slate-400 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Link khác ↗
          </a>
        )}
      </div>

      {!readOnly && (
        <div className="relative mt-4 flex flex-wrap gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-4">
          <Button
            size="sm"
            disabled={isProcessing}
            onClick={() => onAccept?.(id)}
            className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-md hover:bg-emerald-700"
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Chấp thuận
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => onReject?.(id)}
            className="h-9 rounded-xl border-rose-200 dark:border-rose-900/60 px-4 text-xs font-black text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <XCircle className="h-3.5 w-3.5" />
            Từ chối
          </Button>
        </div>
      )}
    </div>
  );
}
