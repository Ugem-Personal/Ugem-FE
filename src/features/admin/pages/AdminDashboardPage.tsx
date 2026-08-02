import { useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CalendarPlus,
  Clock3,
  FileCheck2,
  HandCoins,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  UserRoundPlus,
  Users,
  WalletCards,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { notify } from "@/shared/lib/notify";
import {
  useAdminDashboard,
  useAdminMerchantRevenues,
} from "../hooks/useAdminDashboard";
import type {
  AdminDashboard,
  AdminMerchantRevenue,
} from "../services/adminService";

const DEFAULT_DASHBOARD: AdminDashboard = {
  totalUsers: 0,
  totalMerchants: 0,
  totalRevenue: 0,
  totalPlatformFee: 0,
  totalReviewerFee: 0,
  totalCompletedOrders: 0,
  averageOrderValue: 0,
  newUsersToday: 0,
  pendingApplications: 0,
  pendingReviewerApplications: 0,
};

function toNumber(value?: number | null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("vi-VN").format(toNumber(value));
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatPercent(value?: number | null) {
  const numeric = toNumber(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Vui lòng thử lại.";
}

function getInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "MG";

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AdminDashboardPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPageIndex(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dashboardQuery = useAdminDashboard();
  const merchantRevenueQuery = useAdminMerchantRevenues({
    searchTerm,
    pageIndex,
    pageSize,
  });

  const dashboard = dashboardQuery.data ?? DEFAULT_DASHBOARD;
  const merchantRevenues = merchantRevenueQuery.data ?? [];
  const completedOrders =
    dashboard.totalCompletedOrders ?? dashboard.totalOrders ?? 0;
  const totalRevenue = toNumber(dashboard.totalRevenue);
  const totalPlatformFee = toNumber(dashboard.totalPlatformFee);
  const totalReviewerFee = toNumber(dashboard.totalReviewerFee);
  const merchantNetRevenue = Math.max(
    0,
    totalRevenue - totalPlatformFee - totalReviewerFee,
  );
  const platformRate =
    totalRevenue > 0 ? (totalPlatformFee / totalRevenue) * 100 : 0;
  const reviewerRate =
    totalRevenue > 0 ? (totalReviewerFee / totalRevenue) * 100 : 0;
  const formatFeeMixRate = (value: number) => `${value.toFixed(3)}%`;
  const topMerchant = merchantRevenues.find(
    (merchant) => toNumber(merchant.totalRevenue) > 0,
  );
  const hasNextPage = merchantRevenues.length === pageSize;
  const isRefreshing =
    dashboardQuery.isRefetching || merchantRevenueQuery.isRefetching;

  useEffect(() => {
    if (dashboardQuery.isError) {
      notify.error(
        `Không tải được dashboard Admin: ${getErrorMessage(
          dashboardQuery.error,
        )}`,
      );
    }
  }, [dashboardQuery.error, dashboardQuery.isError]);

  useEffect(() => {
    if (merchantRevenueQuery.isError) {
      notify.error(
        `Không tải được bảng doanh thu merchant: ${getErrorMessage(
          merchantRevenueQuery.error,
        )}`,
      );
    }
  }, [merchantRevenueQuery.error, merchantRevenueQuery.isError]);

  const refreshAll = () => {
    void Promise.all([
      dashboardQuery.refetch(),
      merchantRevenueQuery.refetch(),
    ]);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPageIndex(1);
  };

  return (
    <main className="app-page min-w-0 space-y-6">
      {/* 1. Page Header & Welcome Section */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xs dark:bg-slate-900/90 sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Tổng Quan Doanh Thu & Hệ Thống
            </h1>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground max-w-2xl">
              Theo dõi doanh thu đơn hàng, phí nền tảng, hoa hồng reviewer và hiệu năng vận hành real-time từ API.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              variant="outline"
              className="h-11 rounded-xl font-bold"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2",
                  isRefreshing && "animate-spin",
                )}
              />
              {isRefreshing ? "Đang cập nhật..." : "Làm mới"}
            </Button>
          </div>
        </div>
      </header>

      {dashboardQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-bold text-destructive flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>Không tải được dashboard Admin. {getErrorMessage(dashboardQuery.error)}</span>
        </div>
      ) : null}

      {/* 2. Hero & Insights Section */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
        <RevenueHeroCard
          isLoading={dashboardQuery.isLoading}
          totalRevenue={dashboard.totalRevenue}
          topMerchant={topMerchant}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InsightCard
            icon={WalletCards}
            label="Net Merchant"
            value={formatCurrency(merchantNetRevenue)}
            description="Gross revenue sau khi trừ phí nền tảng & reviewer fee"
            tone="emerald"
          />
          <InsightCard
            icon={Activity}
            label="Tỷ lệ Fee Mix"
            value={`${formatFeeMixRate(platformRate)} / ${formatFeeMixRate(reviewerRate)}`}
            description="Tỷ lệ Platform Fee / Reviewer Fee trên tổng doanh thu"
            tone="amber"
          />
        </div>
      </section>

      {/* 3. KPI Summary Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))
        ) : (
          <>
            <KpiCard
              title="Phí nền tảng"
              value={formatCurrency(dashboard.totalPlatformFee)}
              icon={Banknote}
              tone="slate"
              hint="Sum PlatformFee"
            />
            <KpiCard
              title="Phí Reviewer / Affiliate"
              value={formatCurrency(dashboard.totalReviewerFee)}
              icon={HandCoins}
              tone="emerald"
              hint="Sum ReviewerFee"
            />
            <KpiCard
              title="Đơn hoàn tất"
              value={formatNumber(completedOrders)}
              icon={ShoppingBag}
              tone="amber"
              hint="Số đơn hàng Completed"
            />
            <KpiCard
              title="Giá trị đơn trung bình (AOV)"
              value={formatCurrency(dashboard.averageOrderValue)}
              icon={WalletCards}
              tone="rose"
              hint="Doanh thu / Đơn completed"
            />
          </>
        )}
      </section>

      {/* 4. Quick Actions for Admin Role */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs dark:bg-slate-900/90">
        <h2 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Thao tác nhanh (Admin Actions)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/admin/staff"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-cyan-500 hover:bg-accent dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Quản trị Staff</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            to="/admin/applications"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-cyan-500 hover:bg-accent dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                <CalendarPlus className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Duyệt Merchant</span>
            </div>
            <Badge variant="warning" className="text-[10px]">{dashboard.pendingApplications}</Badge>
          </Link>

          <Link
            to="/admin/reviewer-applications"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-cyan-500 hover:bg-accent dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <FileCheck2 className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Duyệt Reviewer</span>
            </div>
            <Badge variant="success" className="text-[10px]">{dashboard.pendingReviewerApplications}</Badge>
          </Link>

          <Link
            to="/admin/audit-logs"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-cyan-500 hover:bg-accent dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Clock3 className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Audit Logs</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* 5. Main Merchant Revenue Table & Operations Panel */}
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <MerchantRevenuePanel
          clearSearch={clearSearch}
          hasNextPage={hasNextPage}
          merchantRevenueQuery={merchantRevenueQuery}
          merchantRevenues={merchantRevenues}
          pageIndex={pageIndex}
          searchInput={searchInput}
          setPageIndex={setPageIndex}
          setSearchInput={setSearchInput}
        />

        <OperationsPanel dashboard={dashboard} />
      </section>
    </main>
  );
}

function RevenueHeroCard({
  isLoading,
  topMerchant,
  totalRevenue,
}: {
  isLoading: boolean;
  topMerchant?: AdminMerchantRevenue;
  totalRevenue: number;
}) {
  if (isLoading) {
    return (
      <div className="h-72 animate-pulse rounded-3xl border border-border bg-card" />
    );
  }

  return (
    <article className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-slate-950 to-emerald-600/20 pointer-events-none" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-cyan-200 ring-1 ring-white/15">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Revenue Command Center</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cyan-300">
            Tổng doanh thu Completed
          </p>
          <p className="mt-1 break-words text-4xl sm:text-5xl font-black leading-tight text-white">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-300 max-w-lg leading-relaxed">
            Tổng giá trị giao dịch các đơn hàng đã hoàn thành trên toàn hệ thống UGem.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-white">Top Merchant</p>
            <Badge className="border-0 bg-cyan-400 text-slate-950 font-bold text-[10px]">
              Live API
            </Badge>
          </div>

          {topMerchant ? (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-xs font-bold text-slate-950 shadow-sm">
                  {topMerchant.logoUrl ? (
                    <img
                      src={topMerchant.logoUrl}
                      alt={topMerchant.merchantName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(topMerchant.merchantName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {topMerchant.merchantName}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {formatNumber(topMerchant.completedOrders)} đơn completed
                  </p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-cyan-300">
                {formatCurrency(topMerchant.totalRevenue)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-300">
                AOV {formatCurrency(topMerchant.averageOrderValue)}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-xs font-medium text-slate-400">
              Chưa có merchant phát sinh doanh thu.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function InsightCard({
  description,
  icon: Icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "emerald" | "amber";
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-xs dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-black text-foreground">{value}</p>
        </div>
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            tone === "emerald" && "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
            tone === "amber" && "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground leading-relaxed">{description}</p>
    </article>
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
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: "cyan" | "slate" | "emerald" | "amber" | "rose";
  hint: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-md dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            tone === "cyan" && "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
            tone === "slate" && "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
            tone === "emerald" && "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
            tone === "amber" && "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
            tone === "rose" && "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          KPI
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-1 break-words text-2xl font-black text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
        {hint}
      </p>
    </div>
  );
}

function MerchantRevenuePanel({
  clearSearch,
  hasNextPage,
  merchantRevenueQuery,
  merchantRevenues,
  pageIndex,
  searchInput,
  setPageIndex,
  setSearchInput,
}: {
  clearSearch: () => void;
  hasNextPage: boolean;
  merchantRevenueQuery: ReturnType<typeof useAdminMerchantRevenues>;
  merchantRevenues: AdminMerchantRevenue[];
  pageIndex: number;
  searchInput: string;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs dark:bg-slate-900/90">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
              <Store className="h-3 w-3" />
              <span>Merchant Revenue</span>
            </div>
            <h2 className="text-lg font-black text-foreground">
              Bảng Doanh Thu Theo Merchant
            </h2>
          </div>

          <Badge variant="outline" className="text-xs">
            10 merchant / trang
          </Badge>
        </div>

        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm merchant theo tên..."
              className="h-10 pl-10 pr-10 text-xs"
            />
            {searchInput ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Xóa tìm kiếm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {merchantRevenueQuery.isError ? (
        <div className="m-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive">
          Không tải được bảng doanh thu merchant. {getErrorMessage(merchantRevenueQuery.error)}
        </div>
      ) : null}

      {merchantRevenueQuery.isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : merchantRevenues.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-[200px] font-bold">Merchant</TableHead>
                <TableHead className="text-right font-bold">Completed</TableHead>
                <TableHead className="text-right font-bold">Gross Revenue</TableHead>
                <TableHead className="text-right font-bold">Platform Fee</TableHead>
                <TableHead className="text-right font-bold">Reviewer Fee</TableHead>
                <TableHead className="text-right font-bold">Net Merchant</TableHead>
                <TableHead className="text-right font-bold">AOV</TableHead>
                <TableHead className="font-bold">Đơn gần nhất</TableHead>
                <TableHead className="text-right font-bold">Tăng/Giảm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchantRevenues.map((merchant) => (
                <MerchantRevenueRow
                  key={merchant.merchantId}
                  merchant={merchant}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-xs font-bold text-muted-foreground">
            Chưa có dữ liệu merchant phù hợp với tìm kiếm.
          </p>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Trang {pageIndex} {merchantRevenues.length > 0 ? `(${merchantRevenues.length} merchant)` : ""}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageIndex === 1 || merchantRevenueQuery.isFetching}
            onClick={() => setPageIndex((value) => Math.max(1, value - 1))}
          >
            Trước
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled
            className="h-9 min-w-[36px] font-bold"
          >
            {pageIndex}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNextPage || merchantRevenueQuery.isFetching}
            onClick={() => setPageIndex((value) => value + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </section>
  );
}

function MerchantRevenueRow({ merchant }: { merchant: AdminMerchantRevenue }) {
  return (
    <TableRow className="border-border hover:bg-accent/50">
      <TableCell className="min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600 to-emerald-600 text-xs font-black text-white shadow-xs">
            {merchant.logoUrl ? (
              <img
                src={merchant.logoUrl}
                alt={merchant.merchantName}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(merchant.merchantName)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground text-xs">
              {merchant.merchantName || "N/A"}
            </p>
            <p className="truncate text-[10px] font-mono text-muted-foreground">
              {merchant.merchantId}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-bold text-xs tabular-nums">
        {formatNumber(merchant.completedOrders)}
      </TableCell>
      <TableCell className="text-right font-bold text-xs tabular-nums text-foreground">
        {formatCurrency(merchant.totalRevenue)}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(merchant.platformFee)}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(merchant.reviewerFee)}
      </TableCell>
      <TableCell className="text-right font-bold text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
        {formatCurrency(merchant.merchantReceive)}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(merchant.averageOrderValue)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(merchant.lastOrderAt)}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <GrowthBadge value={merchant.revenueGrowth} />
      </TableCell>
    </TableRow>
  );
}

function GrowthBadge({ value }: { value?: number | null }) {
  const numeric = toNumber(value);
  const isPositive = numeric > 0;
  const isNegative = numeric < 0;
  const Icon = isNegative ? ArrowDownRight : ArrowUpRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
        isPositive && "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
        isNegative && "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
        !isPositive && !isNegative && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {formatPercent(numeric)}
    </span>
  );
}

function OperationsPanel({ dashboard }: { dashboard: AdminDashboard }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Operations KPI
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              Chỉ Số Vận Hành
            </h2>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
            <Clock3 className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-4 grid gap-2.5">
          <MetricCard
            icon={Users}
            label="Tổng người dùng"
            value={formatNumber(dashboard.totalUsers)}
            description="Tài khoản trong hệ thống"
          />
          <MetricCard
            icon={Building2}
            label="Tổng merchant"
            value={formatNumber(dashboard.totalMerchants)}
            description="Merchant đã kích hoạt"
          />
          <MetricCard
            icon={UserRoundPlus}
            label="Mới hôm nay"
            value={formatNumber(dashboard.newUsersToday)}
            description="Đăng ký trong ngày"
          />
          <MetricCard
            icon={CalendarPlus}
            label="Hồ sơ merchant chờ"
            value={formatNumber(dashboard.pendingApplications)}
            description="Đơn Merchant đang pending"
          />
          <MetricCard
            icon={FileCheck2}
            label="Đơn Reviewer chờ"
            value={formatNumber(dashboard.pendingReviewerApplications)}
            description="Đơn Reviewer đang pending"
          />
        </div>
      </section>
    </aside>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-black text-foreground">{value}</p>
          <p className="text-[11px] font-medium text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
