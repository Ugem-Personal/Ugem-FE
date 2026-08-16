import { useMemo, type ComponentType } from "react";
import {
  BadgeCheck,
  Clock3,
  FileText,
  Flame,
  Hourglass,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStaffApplications } from "../hooks/useApplications";
import { StaffShell } from "../components/StaffShell";
import { RebalancingOverview } from "../components/RebalancingOverview";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

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
      variant: "success" as const,
      icon: BadgeCheck,
    };
  }

  if (value === "rejected") {
    return {
      label: "Đã từ chối",
      variant: "destructive" as const,
      icon: Flame,
    };
  }

  return {
    label: "Chờ duyệt",
    variant: "warning" as const,
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
      <div className="space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs dark:bg-slate-900/90">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Staff Overview</span>
              </div>
              <h1 className="mt-2 text-2xl font-black text-foreground">
                Dashboard Vận Hành Staff
              </h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Theo dõi tiến độ duyệt hồ sơ Merchant & Reviewer, SLA tốc độ xử lý real-time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/staff/applications">
                <Button size="sm" variant="accent">
                  Phê Duyệt Hồ Sơ ({stats.pending})
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>Không tải được dữ liệu KPI Staff từ API.</span>
          </div>
        ) : null}

        {/* KPI Cards Section */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Tổng hồ sơ"
            value={stats.total}
            icon={FileText}
            tone="cyan"
            hint="Hồ sơ phân công cho Staff"
          />
          <KpiCard
            title="Hồ sơ chờ duyệt"
            value={stats.pending}
            icon={Clock3}
            tone="amber"
            hint="Đang trong hàng chờ review"
          />
          <KpiCard
            title="Đã xử lý"
            value={stats.reviewed}
            icon={BadgeCheck}
            tone="emerald"
            hint="Đã quyết định chấp nhận / từ chối"
          />
          <KpiCard
            title="Tỷ lệ hoàn thành SLA"
            value={`${stats.processingRate.toFixed(0)}%`}
            icon={TrendingUp}
            tone="slate"
            hint="Tỷ lệ Reviewed / Total"
          />
        </section>

        {/* Efficiency Insights & Pending Queue Section */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs dark:bg-slate-900/90 lg:col-span-2">
            <h2 className="text-base font-black text-foreground">Chỉ Số Hiệu Suất Duyệt</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Phân tích chất lượng thẩm định và thời gian xử lý trung bình.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricRow label="Tỷ lệ chấp nhận" value={`${stats.approvalRate.toFixed(0)}%`} />
              <MetricRow label="Hồ sơ đã duyệt" value={formatNumber(stats.approved)} />
              <MetricRow label="Hồ sơ từ chối" value={formatNumber(stats.rejected)} />
              <MetricRow label="Thời gian xử lý TB" value={formatMinutes(stats.avgProcessingMinutes)} />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-foreground">Đánh giá Backlog</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground leading-relaxed">
                {stats.pending === 0
                  ? "Hàng chờ trống. Bạn đã hoàn thành toàn bộ hồ sơ được giao."
                  : `Còn ${formatNumber(stats.pending)} hồ sơ đang chờ trong danh sách review.`}
              </p>
            </div>
          </div>

          {/* Quick List Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs dark:bg-slate-900/90">
            <h2 className="text-base font-black text-foreground">Hồ Sơ Chờ Duyệt Gần Đây</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Hồ sơ gửi lên mới nhất</p>

            <div className="mt-4 space-y-2">
              {stats.recentPending.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-medium text-muted-foreground">
                  Không có hồ sơ pending.
                </div>
              ) : (
                stats.recentPending.map((item) => {
                  const meta = getStatusMeta(item.status);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="truncate text-xs font-bold text-foreground">{item.name || "Hồ sơ merchant"}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Gửi {formatDate(item.createdAt)}</p>
                      </div>
                      <Badge variant={meta.variant} className="text-[10px] shrink-0">
                        {meta.label}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Rebalancing & Ranking Engine Overview (MF4) */}
        <section>
          <RebalancingOverview />
        </section>
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
  tone: "cyan" | "amber" | "emerald" | "slate";
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            tone === "cyan" && "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
            tone === "amber" && "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
            tone === "emerald" && "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
            tone === "slate" && "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          KPI
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}
