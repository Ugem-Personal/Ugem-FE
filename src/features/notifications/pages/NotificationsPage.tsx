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
import { UserAccountMenu } from "@/shared/components";
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
    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, 10000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
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
    <div className="app-page px-4 py-6">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />

      <main className="relative mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase text-cyan-700 ring-1 ring-cyan-100">
                Notification center
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Thông báo
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Theo dõi đơn hàng, hồ sơ merchant/reviewer, staff, affiliate và
                cảnh báo hệ thống.
              </p>
            </div>
          </div>

          <div className="fixed right-5 top-4 z-50 flex flex-wrap items-center justify-end gap-2 lg:right-7">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleMarkAllAsRead()}
              disabled={!notifications.some((item) => !item.isRead)}
              className="h-11 rounded-2xl bg-white px-4 font-black"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đọc tất cả
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-11 rounded-2xl bg-slate-950 px-4 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-cyan-700"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Đang tải..." : "Làm mới"}
            </Button>
            <UserAccountMenu fallbackName="UGem" />
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
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
            value={notifications.filter((item) => getNotificationMeta(item).category !== "general").length}
            description="Order, application, staff, review..."
          />
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
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
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3 text-sm font-black transition",
                    isActive
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-cyan-50 hover:text-cyan-800",
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500",
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
          <div className="rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-xl ring-1 ring-slate-950/5">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-600" />
            <p className="text-sm font-semibold text-slate-500">
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
          <div className="rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-xl ring-1 ring-slate-950/5">
            <Bell className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="font-black text-slate-700">
              Không có thông báo trong bộ lọc này.
            </p>
            <p className="mt-1 text-sm text-slate-500">
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
    <article className="rounded-3xl border border-white/70 dark:border-slate-800 bg-white/75 dark:bg-slate-900/80 p-5 shadow-xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-100 dark:ring-cyan-900">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
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

  const handleActionClick = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (!item.isRead) {
      onMarkAsRead(item.id);
    }

    if (!shouldRefreshReviewerRole) return;

    event.preventDefault();

    try {
      const refreshed = await refreshCurrentSession();
      window.location.assign(
        refreshed.user.Role === "Reviewer" ? "/affiliate-links" : meta.actionTo!,
      );
    } catch (error) {
      console.error(error);
      window.location.assign(meta.actionTo!);
    }
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border bg-white/85 dark:bg-slate-900/85 p-5 shadow-xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl",
        item.isRead ? "border-white/70 dark:border-slate-800" : tone.border,
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
                className={cn("border-0 px-2.5 py-1 font-black ring-1", tone.badge)}
              >
                {meta.categoryLabel}
              </Badge>
              {!item.isRead ? (
                <Badge className="border-0 bg-cyan-600 text-white">
                  Chưa đọc
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  Đã đọc
                </Badge>
              )}
            </div>

            <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
              {getNotificationTitle(item)}
            </h2>

            {body ? (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            ) : null}

            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {time || "Mới cập nhật"}
            </p>
          </div>
        </div>

        {meta.actionTo ? (
          <Button
            asChild
            variant="outline"
            className="h-10 shrink-0 rounded-2xl bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 font-black"
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
