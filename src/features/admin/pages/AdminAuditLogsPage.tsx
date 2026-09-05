import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  getAdminAuditLogs,
  type AuditLog,
  type AuditLogPage,
} from "../services/adminService";

const EMPTY_PAGE: AuditLogPage = {
  items: [],
  totalItems: 0,
  pageIndex: 1,
  pageSize: 20,
  totalPages: 0,
};

const actionLabels: Record<string, string> = {
  ADMIN_BOOTSTRAPPED: "Khởi tạo Admin",
  STAFF_CREATED: "Tạo Staff",
  STAFF_DEACTIVATED: "Khóa Staff",
  MERCHANT_APPLICATION_ACCEPTED: "Duyệt Merchant",
  MERCHANT_APPLICATION_REJECTED: "Từ chối Merchant",
  REVIEWER_APPLICATION_ACCEPTED: "Duyệt Reviewer",
  REVIEWER_APPLICATION_REJECTED: "Từ chối Reviewer",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getActionLabel(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ");
}

function getActionTone(action: string) {
  if (action.includes("REJECTED") || action.includes("DEACTIVATED")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (action.includes("ACCEPTED") || action.includes("CREATED")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-700";
}

function MetadataDetails({ log }: { log: AuditLog }) {
  if (!log.metadata) return null;

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
      <summary className="min-h-8 cursor-pointer py-1 font-bold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-200">
        Dữ liệu kỹ thuật
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white/70 p-2 font-mono leading-5 dark:bg-slate-900">
        {JSON.stringify(log.metadata, null, 2)}
      </pre>
    </details>
  );
}

export default function AdminAuditLogsPage() {
  const [pageIndex, setPageIndex] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const auditLogsQuery = useQuery({
    queryKey: ["admin", "audit-logs", search, pageIndex],
    queryFn: () => getAdminAuditLogs({ search, pageIndex, pageSize: 20 }),
    placeholderData: (previousData) => previousData,
  });
  const page = auditLogsQuery.data ?? EMPTY_PAGE;
  const loading = auditLogsQuery.isLoading || auditLogsQuery.isFetching;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageIndex(1);
    setSearch(searchInput.trim());
  }

  return (
    <section className="min-h-dvh px-4 py-6 text-slate-950 dark:text-slate-100 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-800">
              <ShieldCheck className="h-4 w-4" />
              Security & governance
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Nhật ký hệ thống
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Theo dõi ai đã thực hiện thao tác quản trị nào, trên đối tượng nào
              và vào thời điểm nào.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void auditLogsQuery.refetch()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </header>

        <form
          onSubmit={handleSearch}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/90 sm:flex-row"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tìm trong nhật ký</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm người thực hiện, hành động hoặc mã đối tượng"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-700 px-6 text-sm font-black text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30"
          >
            Áp dụng
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            {page.totalItems.toLocaleString("vi-VN")} sự kiện
          </p>
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPageIndex(1);
              }}
              className="min-h-11 rounded-xl px-3 text-sm font-bold text-cyan-700 hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>

        {auditLogsQuery.isError ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800"
          >
            Không tải được nhật ký. Hãy kiểm tra kết nối rồi thử lại.
          </div>
        ) : loading && page.items.length === 0 ? (
          <div className="mt-5 grid gap-3" aria-label="Đang tải nhật ký">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : page.items.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-white/10 dark:bg-slate-900/70">
            <FileClock className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              Chưa có sự kiện phù hợp
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Thử xóa từ khóa hoặc thực hiện một thao tác quản trị mới.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:hidden">
              {page.items.map((log) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${getActionTone(log.action)}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                    <time
                      className="text-xs font-semibold text-slate-500"
                      dateTime={log.createdAt}
                    >
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>
                  <p className="mt-4 font-black text-slate-900 dark:text-white">
                    {log.actor?.fullName || "Hệ thống"}
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                    {log.actor?.email || log.actorRole || "Không xác định"}
                  </p>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-bold">Đối tượng:</span>{" "}
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </p>
                  <MetadataDetails log={log} />
                </article>
              ))}
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-slate-950 dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-300 dark:text-slate-200">
                  <tr>
                    <th className="w-[24%] px-5 py-4">Hành động</th>
                    <th className="w-[22%] px-5 py-4">Người thực hiện</th>
                    <th className="w-[28%] px-5 py-4">Đối tượng</th>
                    <th className="w-[26%] px-5 py-4">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {page.items.map((log) => (
                    <tr
                      key={log.id}
                      className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getActionTone(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                        <MetadataDetails log={log} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {log.actor?.fullName || "Hệ thống"}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                          {log.actor?.email || log.actorRole || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        <p className="font-bold">{log.entityType}</p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                          {log.entityId || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <time
                          className="font-semibold text-slate-700 dark:text-slate-300"
                          dateTime={log.createdAt}
                        >
                          {formatDateTime(log.createdAt)}
                        </time>
                        {log.ipAddress ? (
                          <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                            IP {log.ipAddress}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {page.totalPages > 1 ? (
          <nav
            className="mt-6 flex items-center justify-between gap-4"
            aria-label="Phân trang nhật ký"
          >
            <button
              type="button"
              onClick={() => setPageIndex((value) => Math.max(1, value - 1))}
              disabled={pageIndex <= 1 || loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" /> Trang trước
            </button>
            <span className="text-sm font-bold text-slate-600">
              Trang {page.pageIndex}/{page.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPageIndex((value) => Math.min(page.totalPages, value + 1))
              }
              disabled={pageIndex >= page.totalPages || loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Trang sau <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
