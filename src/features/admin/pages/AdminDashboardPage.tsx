import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  BellRing,
  Building2,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  HandCoins,
  LayoutDashboard,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  UserRoundPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import ugemLogo from "@/assets/ugem-logo.png";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/shared/components";
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

const adminNavItems = [
  {
    label: "Dashboard",
    description: "Revenue console",
    to: "/admin/dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Staff",
    description: "Quản trị đội vận hành",
    to: "/admin/staff",
    icon: Users,
  },
  {
    label: "Merchant hồ sơ",
    description: "Duyệt onboarding",
    to: "/admin/applications",
    icon: ClipboardList,
  },
  {
    label: "Reviewer",
    description: "Đơn đăng ký reviewer",
    to: "/admin/reviewer-applications",
    icon: FileCheck2,
  },
  {
    label: "Notifications",
    description: "Thông báo hệ thống",
    to: "/admin/notifications",
    icon: BellRing,
  },
] satisfies {
  label: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
}[];

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
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="min-h-screen bg-[linear-gradient(90deg,rgba(14,165,233,0.10)_0%,rgba(255,255,255,0)_34%),linear-gradient(180deg,#ffffff_0%,#f5f7fb_38%,#f8fafc_100%)]">
        <div className="grid min-h-screen lg:grid-cols-[304px_minmax(0,1fr)]">
          <AdminSidebar />

          <main className="min-w-0 px-4 py-4 sm:px-5 lg:px-7 lg:py-6">
            <div className="mx-auto max-w-420 space-y-5">
              <header className="-mx-4 border-b border-white/70 bg-[#f5f7fb]/88 px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                      <span>Admin</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="text-cyan-700">Revenue dashboard</span>
                    </div>
                    <h1 className="mt-1 text-3xl font-black text-slate-950">
                      Tổng quan doanh thu
                    </h1>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Doanh thu đơn hoàn tất, phí nền tảng, phí
                      reviewer/affiliate và hiệu quả theo từng merchant.
                    </p>
                  </div>

                  <div className="fixed right-5 top-4 z-50 flex min-w-0 flex-wrap items-center justify-end gap-2 lg:right-7">
                    <Button
                      type="button"
                      onClick={refreshAll}
                      disabled={isRefreshing}
                      className="h-11 rounded-2xl bg-slate-950 px-4 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-cyan-700"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isRefreshing && "animate-spin",
                        )}
                      />
                      {isRefreshing ? "Đang tải" : "Làm mới"}
                    </Button>

                    <UserAccountMenu
                      fallbackName="Admin"
                      className="max-w-full"
                    />
                  </div>
                </div>
              </header>

              {dashboardQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm">
                  Không tải được dashboard Admin.{" "}
                  {getErrorMessage(dashboardQuery.error)}
                </div>
              ) : null}

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
                <RevenueHeroCard
                  isLoading={dashboardQuery.isLoading}
                  totalRevenue={dashboard.totalRevenue}
                  topMerchant={topMerchant}
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <InsightCard
                    icon={WalletCards}
                    label="Net merchant"
                    value={formatCurrency(merchantNetRevenue)}
                    description="Gross revenue trừ platform fee và reviewer fee"
                    tone="emerald"
                  />
                  <InsightCard
                    icon={Activity}
                    label="Fee mix"
                    value={`${formatFeeMixRate(platformRate)} / ${formatFeeMixRate(reviewerRate)}`}
                    description="Platform fee / reviewer fee trên tổng doanh thu"
                    tone="amber"
                  />
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                {dashboardQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                  ))
                ) : (
                  <>
                    <KpiCard
                      title="Doanh thu nền tảng"
                      value={formatCurrency(dashboard.totalPlatformFee)}
                      icon={Banknote}
                      tone="slate"
                      hint="Sum PlatformFee"
                    />
                    <KpiCard
                      title="Phí reviewer/affiliate"
                      value={formatCurrency(dashboard.totalReviewerFee)}
                      icon={HandCoins}
                      tone="emerald"
                      hint="Sum ReviewerFee"
                    />
                    <KpiCard
                      title="Đơn completed"
                      value={formatNumber(completedOrders)}
                      icon={ShoppingBag}
                      tone="amber"
                      hint="Số đơn đã hoàn tất"
                    />
                    <KpiCard
                      title="Giá trị đơn TB"
                      value={formatCurrency(dashboard.averageOrderValue)}
                      icon={WalletCards}
                      tone="rose"
                      hint="Revenue / completed orders"
                    />
                  </>
                )}
              </section>

              <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <MerchantRevenuePanel
                  clearSearch={clearSearch}
                  hasNextPage={hasNextPage}
                  merchantRevenueQuery={merchantRevenueQuery}
                  merchantRevenues={merchantRevenues}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  searchInput={searchInput}
                  setPageIndex={setPageIndex}
                  setSearchInput={setSearchInput}
                />

                <OperationsPanel dashboard={dashboard} />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminSidebar() {
  return (
    <aside className="border-b border-white/80 bg-slate-950 px-4 py-4 text-white shadow-2xl shadow-slate-950/20 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:px-5 lg:py-6">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
            <img src={ugemLogo} alt="UGem" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-cyan-200">
              UGem Admin
            </p>
            <h2 className="truncate text-lg font-black">Revenue Console</h2>
          </div>
        </div>

        <nav className="grid gap-1.5">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3 py-3 transition",
                  item.active
                    ? "bg-white text-slate-950 shadow-xl shadow-cyan-950/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                    item.active
                      ? "bg-cyan-50 text-cyan-700"
                      : "bg-white/8 text-slate-300 group-hover:bg-white/12",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-xs font-medium",
                      item.active ? "text-slate-500" : "text-slate-500",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
                {item.active ? (
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="grid gap-3 lg:mt-auto">
          <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-black uppercase text-cyan-200">
              Workspace
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Revenue, merchant và workflow admin trong một console.
            </p>
          </div>
        </div>
      </div>
    </aside>
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
      <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
    );
  }

  return (
    <article className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/10">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.34),rgba(16,185,129,0.16)_42%,rgba(245,158,11,0.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-cyan-300/60 to-transparent" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-cyan-100 ring-1 ring-white/15">
            <BarChart3 className="h-3.5 w-3.5" />
            Revenue command center
          </div>
          <p className="mt-5 text-sm font-semibold text-cyan-100">
            Tổng doanh thu completed
          </p>
          <p className="mt-2 wrap-break-word text-5xl font-black leading-tight text-white">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            Giá trị gross từ các đơn Completed trên toàn hệ thống.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-white">Top merchant</p>
            <Badge className="border-0 bg-cyan-300 text-slate-950">
              Live API
            </Badge>
          </div>

          {topMerchant ? (
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-sm font-black text-slate-950">
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
                  <p className="truncate font-black text-white">
                    {topMerchant.merchantName}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-300">
                    {formatNumber(topMerchant.completedOrders)} completed
                  </p>
                </div>
              </div>
              <p className="mt-5 text-3xl font-black">
                {formatCurrency(topMerchant.totalRevenue)}
              </p>
              <p className="mt-1 text-xs font-semibold text-cyan-100">
                AOV {formatCurrency(topMerchant.averageOrderValue)}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-4 text-sm font-semibold text-slate-300">
              Chưa có merchant phát sinh doanh thu trên trang hiện tại.
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            tone === "emerald" && "bg-emerald-50 text-emerald-700",
            tone === "amber" && "bg-amber-50 text-amber-700",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>
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
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/8">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            tone === "cyan" && "bg-cyan-50 text-cyan-700",
            tone === "slate" && "bg-slate-100 text-slate-900",
            tone === "emerald" && "bg-emerald-50 text-emerald-700",
            tone === "amber" && "bg-amber-50 text-amber-700",
            tone === "rose" && "bg-rose-50 text-rose-700",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">
          KPI
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 wrap-break-word text-2xl font-black text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
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
  pageSize,
  searchInput,
  setPageIndex,
  setSearchInput,
}: {
  clearSearch: () => void;
  hasNextPage: boolean;
  merchantRevenueQuery: ReturnType<typeof useAdminMerchantRevenues>;
  merchantRevenues: AdminMerchantRevenue[];
  pageIndex: number;
  pageSize: number;
  searchInput: string;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/7">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
              <Store className="h-3.5 w-3.5" />
              Merchant revenue
            </div>
            <h2 className="text-xl font-black text-slate-950">
              Bảng doanh thu theo merchant
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Gross revenue, platform fee, reviewer fee, net merchant và
              tăng/giảm theo tháng hiện tại.
            </p>
          </div>

          <Badge
            variant="secondary"
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
          >
            10 quán / trang
          </Badge>
        </div>

        <div className="mt-4">
          <div className="relative max-w-2xl flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm merchant theo tên..."
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-12 text-base shadow-none focus-visible:border-cyan-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-cyan-500/15"
            />
            {searchInput ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Xóa bộ lọc"
                aria-label="Xóa bộ lọc"
                onClick={clearSearch}
                className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {merchantRevenueQuery.isError ? (
        <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          Không tải được bảng doanh thu merchant.{" "}
          {getErrorMessage(merchantRevenueQuery.error)}
        </div>
      ) : null}

      {merchantRevenueQuery.isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : merchantRevenues.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
              <TableHead className="min-w-72 font-black text-slate-600">
                Merchant
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Completed
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Gross revenue
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Platform fee
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Reviewer fee
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Net merchant
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                AOV
              </TableHead>
              <TableHead className="whitespace-nowrap font-black text-slate-600">
                Đơn gần nhất
              </TableHead>
              <TableHead className="whitespace-nowrap text-right font-black text-slate-600">
                Tăng/giảm
              </TableHead>
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
      ) : (
        <div className="p-5">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-bold text-slate-500">
              Chưa có merchant nào khớp bộ lọc hiện tại.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
        <p className="text-sm text-slate-500">
          Hiển thị {formatNumber(merchantRevenues.length)} merchant trên trang{" "}
          {pageIndex}
          {!hasNextPage && merchantRevenues.length > 0
            ? " - đã tới cuối danh sách"
            : ""}
          .
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pageIndex === 1 || merchantRevenueQuery.isFetching}
            onClick={() => setPageIndex((value) => Math.max(1, value - 1))}
            className="h-10 rounded-2xl bg-white px-4 font-black"
          >
            Trước
          </Button>

          {pageIndex > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={merchantRevenueQuery.isFetching}
              onClick={() => setPageIndex(pageIndex - 1)}
              className="h-10 min-w-10 rounded-2xl bg-white px-3 font-black"
            >
              {pageIndex - 1}
            </Button>
          ) : null}

          <Button
            type="button"
            disabled
            className="h-10 min-w-10 rounded-2xl bg-slate-950 px-3 font-black text-white opacity-100"
          >
            {pageIndex}
          </Button>

          {hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              disabled={merchantRevenueQuery.isFetching}
              onClick={() => setPageIndex(pageIndex + 1)}
              className="h-10 min-w-10 rounded-2xl bg-white px-3 font-black"
            >
              {pageIndex + 1}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={!hasNextPage || merchantRevenueQuery.isFetching}
            onClick={() => setPageIndex((value) => value + 1)}
            className="h-10 rounded-2xl bg-white px-4 font-black"
          >
            Sau
          </Button>
        </div>

        {merchantRevenueQuery.isFetching && !merchantRevenueQuery.isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Đang cập nhật bảng...
          </span>
        ) : null}
      </div>
    </section>
  );
}

function MerchantRevenueRow({ merchant }: { merchant: AdminMerchantRevenue }) {
  return (
    <TableRow className="border-slate-100 hover:bg-cyan-50/55">
      <TableCell className="min-w-72">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-cyan-600 to-emerald-500 text-sm font-black text-white shadow-sm shadow-slate-950/10">
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
            <p className="truncate font-black text-slate-950">
              {merchant.merchantName || "N/A"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {merchant.merchantId}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-bold tabular-nums">
        {formatNumber(merchant.completedOrders)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-bold tabular-nums text-slate-950">
        {formatCurrency(merchant.totalRevenue)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums text-slate-600">
        {formatCurrency(merchant.platformFee)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums text-slate-600">
        {formatCurrency(merchant.reviewerFee)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-black tabular-nums text-emerald-700">
        {formatCurrency(merchant.merchantReceive)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right tabular-nums text-slate-600">
        {formatCurrency(merchant.averageOrderValue)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-slate-600">
        {formatDateTime(merchant.lastOrderAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right">
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
        "inline-flex items-center justify-end gap-1 rounded-full px-2.5 py-1 text-xs font-black tabular-nums",
        isPositive && "bg-emerald-50 text-emerald-700",
        isNegative && "bg-rose-50 text-rose-700",
        !isPositive && !isNegative && "bg-slate-100 text-slate-500",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatPercent(numeric)}
    </span>
  );
}

function OperationsPanel({ dashboard }: { dashboard: AdminDashboard }) {
  return (
    <aside className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700">
              Operations
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Chỉ số vận hành
            </h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Clock3 className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          <MetricCard
            icon={Users}
            label="Tổng người dùng"
            value={formatNumber(dashboard.totalUsers)}
            description="Tất cả tài khoản trong hệ thống"
          />
          <MetricCard
            icon={Building2}
            label="Tổng merchant"
            value={formatNumber(dashboard.totalMerchants)}
            description="Merchant đã có hồ sơ hoạt động"
          />
          <MetricCard
            icon={UserRoundPlus}
            label="Người dùng mới hôm nay"
            value={formatNumber(dashboard.newUsersToday)}
            description="Tài khoản mới trong ngày"
          />
          <MetricCard
            icon={CalendarPlus}
            label="Hồ sơ merchant chờ duyệt"
            value={formatNumber(dashboard.pendingApplications)}
            description="Chờ Staff xử lý"
          />
          <MetricCard
            icon={FileCheck2}
            label="Reviewer application"
            value={formatNumber(dashboard.pendingReviewerApplications)}
            description="Chờ Staff xử lý"
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-100">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
