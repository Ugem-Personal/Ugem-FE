import { useMemo } from "react";
import type { ComponentType } from "react";
import {
  BadgeCheck,
  Clock3,
  FileText,
  Flame,
  Hourglass,
  TrendingUp,
} from "lucide-react";
import { useStaffApplications } from "../hooks/useApplications";
import { StaffShell } from "../components/StaffShell";

function formatDate(value?: string | number | null, fallback = "-") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value < 60) return `${Math.round(value)} phút`;

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

function getStatusMeta(status?: string) {
  const value = status?.toLowerCase();

  if (value === "approved" || value === "accepted") {
    return {
      label: "Đã duyệt",
      tone: "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
      icon: BadgeCheck,
    };
  }

  if (value === "rejected") {
    return {
      label: "Đã từ chối",
      tone: "border border-rose-200 bg-rose-50 text-rose-700 shadow-sm",
      icon: Flame,
    };
  }

  return {
    label: "Chờ duyệt",
    tone: "border border-amber-200 bg-amber-50 text-amber-700 shadow-sm",
    icon: Hourglass,
  };
}

export default function StaffProfilePage() {
  const { data: applications = [], isError } = useStaffApplications();

  const stats = useMemo(() => {
    const pending = applications.filter(
      (item) => !item.status || item.status.toLowerCase() === "pending",
    );
    const approved = applications.filter((item) => {
      const value = item.status?.toLowerCase();
      return value === "approved" || value === "accepted";
    });
    const rejected = applications.filter(
      (item) => item.status?.toLowerCase() === "rejected",
    );
    const reviewed = applications.filter(
      (item) => item.status && item.status.toLowerCase() !== "pending",
    );

    const processingRate =
      applications.length > 0
        ? (reviewed.length / applications.length) * 100
        : 0;
    const approvalRate =
      reviewed.length > 0 ? (approved.length / reviewed.length) * 100 : 0;

    const processingDurations = reviewed
      .map((item) => {
        const createdAt = new Date(item.createdAt || 0).getTime();
        const reviewedAt = new Date(item.reviewedAt || 0).getTime();
        if (!createdAt || !reviewedAt || reviewedAt <= createdAt) return 0;
        return (reviewedAt - createdAt) / 60000;
      })
      .filter((value) => value > 0);

    const avgProcessingMinutes =
      processingDurations.length > 0
        ? processingDurations.reduce((sum, value) => sum + value, 0) /
          processingDurations.length
        : 0;

    const recentReviewed = [...reviewed]
      .sort(
        (a, b) =>
          new Date(b.reviewedAt || 0).getTime() -
          new Date(a.reviewedAt || 0).getTime(),
      )
      .slice(0, 5);

    const recentPending = [...pending]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 5);

    return {
      total: applications.length,
      pending: pending.length,
      reviewed: reviewed.length,
      approved: approved.length,
      rejected: rejected.length,
      processingRate,
      approvalRate,
      avgProcessingMinutes,
      recentReviewed,
      recentPending,
    };
  }, [applications]);

  return (
    <StaffShell activeItem="dashboard">
      <div className="relative w-full">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative">
          <div className="sticky top-4 z-30 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/55 p-3 backdrop-blur-xl ring-1 ring-slate-950/5">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-950/5">
                Staff KPI
              </div>

              <h1 className="break-words text-3xl font-black tracking-tight text-slate-950">
                Dashboard KPI Staff
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Theo dõi khối lượng hồ sơ, tốc độ xử lý và hiệu quả duyệt hồ sơ.
              </p>
            </div>

          </div>

          {isError ? (
            <div className="mb-5 rounded-3xl border border-rose-200 bg-rose-50/85 p-4 text-sm font-semibold text-rose-700 shadow-lg shadow-rose-950/5 ring-1 ring-rose-100 backdrop-blur-xl">
              Không tải được dữ liệu KPI. Vui lòng thử lại sau.
            </div>
          ) : null}

          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Tổng hồ sơ"
                value={stats.total}
                icon={FileText}
                tone="bg-cyan-600 text-white"
                hint="Toàn bộ hồ sơ Staff được phép xem"
              />
              <KpiCard
                title="Chờ duyệt"
                value={stats.pending}
                icon={Clock3}
                tone="bg-amber-500 text-white"
                hint="Chưa ai nhận xử lý"
              />
              <KpiCard
                title="Đã xử lý"
                value={stats.reviewed}
                icon={BadgeCheck}
                tone="bg-emerald-600 text-white"
                hint="Đã duyệt hoặc từ chối"
              />
              <KpiCard
                title="Tỷ lệ xử lý"
                value={`${stats.processingRate.toFixed(0)}%`}
                icon={TrendingUp}
                tone="bg-slate-900 text-white"
                hint="Reviewed / Total"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl xl:col-span-2">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />

                <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      KPI hiệu suất
                    </h2>
                    <p className="text-sm leading-6 text-slate-500">
                      Các chỉ số phản ánh tốc độ và chất lượng xử lý hồ sơ.
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    Cập nhật theo dữ liệu hiện có
                  </span>
                </div>

                <div className="relative grid gap-3 sm:grid-cols-2">
                  <MetricRow
                    label="Tỷ lệ duyệt"
                    value={`${stats.approvalRate.toFixed(0)}%`}
                  />
                  <MetricRow
                    label="Hồ sơ đã duyệt"
                    value={formatNumber(stats.approved)}
                  />
                  <MetricRow
                    label="Hồ sơ từ chối"
                    value={formatNumber(stats.rejected)}
                  />
                  <MetricRow
                    label="Thời gian xử lý TB"
                    value={formatMinutes(stats.avgProcessingMinutes)}
                  />
                </div>

                <div className="relative mt-6 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm ring-1 ring-slate-950/5">
                  <p className="text-sm font-black text-slate-700">
                    Nhận xét nhanh
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {stats.pending === 0
                      ? "Hiện không còn hồ sơ chờ xử lý. Bạn đang ở trạng thái sạch backlog."
                      : `Còn ${formatNumber(stats.pending)} hồ sơ chờ xử lý. Ưu tiên xử lý backlog trước để cải thiện SLA.`}
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />

                <div className="relative">
                  <h2 className="text-xl font-black text-slate-950">
                    Danh sách nhanh
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Hồ sơ mới nhất đang chờ và hồ sơ vừa xử lý.
                  </p>
                </div>

                <div className="relative mt-5 space-y-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                      Chờ duyệt gần đây
                    </p>

                    <div className="mt-2 space-y-2">
                      {stats.recentPending.length === 0 ? (
                        <p className="rounded-2xl border border-white/70 bg-white/75 p-3 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-950/5">
                          Không có hồ sơ pending.
                        </p>
                      ) : (
                        stats.recentPending.map((item) => {
                          const meta = getStatusMeta(item.status);
                          const StatusIcon = meta.icon;

                          return (
                            <div
                              key={item.id}
                              className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-3 pr-24 shadow-sm ring-1 ring-slate-950/5 transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                              <div className="min-w-0">
                                <p className="whitespace-normal text-[13px] font-black leading-5 text-slate-950">
                                  {item.name || "Không tên"}
                                </p>
                                <p className="mt-0.5 whitespace-normal text-[11px] font-semibold leading-5 text-slate-500">
                                  Gửi lúc {formatDate(item.createdAt)}
                                </p>
                              </div>

                              <span
                                className={`absolute right-2 top-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.tone}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {meta.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      Đã xử lý gần đây
                    </p>

                    <div className="mt-2 space-y-2">
                      {stats.recentReviewed.length === 0 ? (
                        <p className="rounded-2xl border border-white/70 bg-white/75 p-3 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-950/5">
                          Chưa có hồ sơ được xử lý.
                        </p>
                      ) : (
                        stats.recentReviewed.map((item) => {
                          const meta = getStatusMeta(item.status);
                          const StatusIcon = meta.icon;

                          return (
                            <div
                              key={item.id}
                              className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-3 pr-24 shadow-sm ring-1 ring-slate-950/5 transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                              <div className="min-w-0">
                                <p className="whitespace-normal text-[13px] font-black leading-5 text-slate-950">
                                  {item.name || "Không tên"}
                                </p>
                                <p className="mt-0.5 whitespace-normal text-[11px] font-semibold leading-5 text-slate-500">
                                  Xử lý lúc {formatDate(item.reviewedAt)}
                                </p>
                              </div>

                              <span
                                className={`absolute right-2 top-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.tone}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {meta.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  hint: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-cyan-950/10">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />

      <div
        className={`relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg shadow-slate-950/10 ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="relative text-sm font-bold text-slate-500">{title}</p>
      <p className="relative mt-2 text-4xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="relative mt-2 text-xs font-semibold leading-5 text-slate-500">
        {hint}
      </p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-950/5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
