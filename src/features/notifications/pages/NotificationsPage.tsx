import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type MouseEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { notify } from "@/shared/lib/notify";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services";
import type { NotificationItem } from "../services";
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationMeta,
  getNotificationText,
  getNotificationTitle,
  getToneClasses,
  type NotificationCategory,
} from "../notificationPresentation";
import { refreshCurrentSession } from "@/features/auth";

const categoryFilters: {
  key: NotificationCategory | "all" | "unread";
  label: string;
}[] = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "order", label: "Đơn hàng" },
  { key: "merchant-application", label: "Merchant" },
  { key: "reviewer-application", label: "Reviewer" },
  { key: "review", label: "Đánh giá" },
  { key: "staff", label: "Staff" },
  { key: "affiliate", label: "Affiliate" },
  { key: "campaign", label: "Ưu đãi" },
  { key: "system", label: "Hệ thống" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<(typeof categoryFilters)[number]["key"]>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async (showError = true) => {
    setLoading(true);

    try {
      const data = await getNotifications();
      setNotifications(data ?? []);
    } catch (error) {
      console.error(error);
      if (showError) {
        notify.error("Không tải được thông báo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const data = await getNotifications();
      setNotifications(data ?? []);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được thông báo.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId?: string) => {
    if (!notificationId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error(error);
      notify.error("Không thể đánh dấu thông báo đã đọc.");
      void loadNotifications(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!notifications.some((item) => !item.isRead)) return;

    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error(error);
      notify.error("Không thể đánh dấu tất cả thông báo đã đọc.");
      void loadNotifications(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void loadNotifications(false));

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications(false);
      }
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const counts = useMemo(() => {
    return notifications.reduce(
      (acc, item) => {
        const category = getNotificationMeta(item).category;
        acc.all += 1;
        if (!item.isRead) acc.unread += 1;
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      },
      {
        all: 0,
        unread: 0,
      } as Record<string, number>,
    );
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    return notifications.filter(
      (item) => getNotificationMeta(item).category === activeFilter,
    );
  }, [activeFilter, notifications]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Background glow & grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <main className="relative mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition-colors">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                Notification center
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Thông báo
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Theo dõi đơn hàng, hồ sơ merchant/reviewer, staff, affiliate và
                cảnh báo hệ thống.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleMarkAllAsRead()}
              disabled={!notifications.some((item) => !item.isRead)}
              className="h-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đọc tất cả
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-11 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-4 font-black text-white dark:text-slate-950 shadow-md hover:bg-slate-800 dark:hover:bg-cyan-400 transition"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Đang tải..." : "Làm mới"}
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <OverviewCard
            icon={Inbox}
            label="Tổng thông báo"
            value={counts.all}
            description="Tất cả notification BE trả về"
          />
          <OverviewCard
            icon={Bell}
            label="Chưa đọc"
            value={counts.unread}
            description="Dựa trên field isRead"
          />
          <OverviewCard
            icon={CheckCircle2}
            label="Đã phân loại"
            value={
              notifications.filter(
                (item) => getNotificationMeta(item).category !== "general",
              ).length
            }
            description="Order, application, staff, review..."
          />
        </section>

        <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryFilters.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count = counts[filter.key] ?? 0;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-black transition",
                    isActive
                      ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                      : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white",
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      isActive
                        ? "bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-12 text-center shadow-xl backdrop-blur-xl">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Đang tải thông báo...
            </p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <section className="grid gap-3">
            {filteredNotifications.map((item, index) => (
              <NotificationCard
                key={item.id ?? `${item.title}-${index}`}
                item={item}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-12 text-center shadow-xl backdrop-blur-xl">
            <Bell className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="font-black text-slate-950 dark:text-white">
              Không có thông báo trong bộ lọc này.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Khi BE phát sinh notification mới, danh sách sẽ tự cập nhật.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function OverviewCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl transition-all hover:translate-y-[-2px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 font-semibold text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </article>
  );
}

function NotificationCard({
  item,
  onMarkAsRead,
}: {
  item: NotificationItem;
  onMarkAsRead: (notificationId?: string) => void;
}) {
  const meta = getNotificationMeta(item);
  const tone = getToneClasses(meta.tone);
  const Icon = meta.icon;
  const body = getNotificationBody(item);
  const time = formatNotificationTime(item.createdAt);
  const shouldRefreshReviewerRole =
    meta.category === "reviewer-application" &&
    ["approved", "chấp thuận", "được duyệt"].some((value) =>
      getNotificationText(item).includes(value),
    );

  const handleActionClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!item.isRead) {
      onMarkAsRead(item.id);
    }

    if (!shouldRefreshReviewerRole) return;

    event.preventDefault();

    try {
      const refreshed = await refreshCurrentSession();
      window.location.assign(
        refreshed.user.Role === "Reviewer"
          ? "/affiliate-links"
          : meta.actionTo!,
      );
    } catch (error) {
      console.error(error);
      window.location.assign(meta.actionTo!);
    }
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border bg-white/80 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl transition-all",
        item.isRead ? "border-slate-200/80 dark:border-white/10" : tone.border,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1",
              tone.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-0 px-2.5 py-1 font-black ring-1",
                  tone.badge,
                )}
              >
                {meta.categoryLabel}
              </Badge>
              {!item.isRead ? (
                <Badge className="border-0 bg-cyan-600 text-white font-black">
                  Chưa đọc
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold"
                >
                  Đã đọc
                </Badge>
              )}
            </div>

            <h2 className="mt-3 text-base sm:text-lg font-black text-slate-950 dark:text-white">
              {getNotificationTitle(item)}
            </h2>

            {body ? (
              <p className="mt-2 text-xs sm:text-sm leading-6 font-semibold text-slate-600 dark:text-slate-300">
                {body}
              </p>
            ) : null}

            <p className="mt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {time || "Mới cập nhật"}
            </p>
          </div>
        </div>

        {meta.actionTo ? (
          <Button
            asChild
            variant="outline"
            className="h-10 shrink-0 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
          >
            <Link to={meta.actionTo} onClick={handleActionClick}>
              {meta.actionLabel}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
