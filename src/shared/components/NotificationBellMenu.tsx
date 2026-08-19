import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/features/notifications/services";
import {
  formatNotificationTime,
  getNotificationBody,
  getNotificationMeta,
  getNotificationText,
  getNotificationTitle,
  getToneClasses,
} from "@/features/notifications/notificationPresentation";
import { refreshCurrentSession } from "@/features/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { notify } from "@/shared/lib/notify";

type NotificationBellMenuProps = {
  className?: string;
};

export function NotificationBellMenu({ className }: NotificationBellMenuProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async ({
    background = false,
    showError = true,
  }: {
    background?: boolean;
    showError?: boolean;
  } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }

    try {
      const [data, count] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(data ?? []);
      setUnreadCount(count);
    } catch (error) {
      console.error(error);
      if (showError) {
        notify.error("Không tải được thông báo.");
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  const hasActiveOrderNotification = useMemo(
    () =>
      notifications.some((item) => {
        if (item.isRead || getNotificationMeta(item).category !== "order") {
          return false;
        }

        return !/(completed|cancelled|canceled|rejected|expired|failed|hoàn tất|đã hủy|từ chối)/i.test(
          getNotificationText(item),
        );
      }),
    [notifications],
  );

  const handleMarkAsRead = async (notificationId?: string) => {
    if (!notificationId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error(error);
      notify.error("Không thể đánh dấu thông báo đã đọc.");
      void loadNotifications({ background: true, showError: false });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((item) => !item.isRead);

    if (unreadNotifications.length === 0) return;

    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error(error);
      notify.error("Không thể đánh dấu tất cả thông báo đã đọc.");
      void loadNotifications({ background: true, showError: false });
    }
  };

  useEffect(() => {
    queueMicrotask(() =>
      void loadNotifications({ showError: false }),
    );
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      void loadNotifications({ background: true, showError: false });
    });
  }, [loadNotifications, open]);

  useEffect(() => {
    if (!open || !hasActiveOrderNotification) return;

    const refreshActiveOrder = () => {
      if (document.visibilityState !== "visible") return;
      void loadNotifications({ background: true, showError: false });
    };
    const interval = window.setInterval(refreshActiveOrder, 30000);

    return () => window.clearInterval(interval);
  }, [hasActiveOrderNotification, loadNotifications, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "relative h-10 w-10 rounded-xl border-slate-200 bg-white p-0 text-cyan-700 shadow-sm hover:bg-cyan-50 dark:border-white/10 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-slate-800",
            className,
          )}
          aria-label="Xem thông báo"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-900 dark:text-white">
              Thông báo
            </DropdownMenuLabel>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Tất cả thông báo của tài khoản hiện tại"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleMarkAllAsRead()}
              className="h-8 gap-1.5 px-2 text-xs text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-cyan-300"
              disabled={initialLoading || refreshing || unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadNotifications({ background: true })}
              className="h-8 gap-1.5 px-2 text-xs text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-cyan-300"
              disabled={initialLoading || refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Làm mới
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0 bg-slate-200 dark:bg-white/10" />

        <div className="max-h-96 overflow-y-auto bg-slate-50/70 p-2 dark:bg-slate-950">
          {initialLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
              Chưa có thông báo nào.
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((item, index) => (
                <BellNotificationItem
                  key={item.id ?? `${item.title}-${index}`}
                  item={item}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="my-0 bg-slate-200 dark:bg-white/10" />

        <div className="bg-white p-3 dark:bg-slate-950">
          <Button
            asChild
            className="h-11 w-full justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-cyan-700 hover:shadow-cyan-900/20 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            <Link to="/notifications" onClick={() => setOpen(false)}>
              Xem t&#7845;t c&#7843; th&#244;ng b&#225;o
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BellNotificationItem({
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
  const content = (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        item.isRead
          ? "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
          : tone.border,
        !item.isRead && tone.panel,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1",
            tone.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black ring-1",
                tone.badge,
              )}
            >
              {meta.categoryLabel}
            </span>
            {!item.isRead ? (
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
            ) : null}
          </div>

          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
            {getNotificationTitle(item)}
          </p>

          {body ? (
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {body}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{time || "Mới cập nhật"}</span>
            <div className="flex items-center gap-2">
              {!item.isRead ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onMarkAsRead(item.id);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-300"
                >
                  Đã đọc
                </button>
              ) : null}
              {meta.actionTo ? (
                <Link
                  to={meta.actionTo}
                  onClick={handleActionClick}
                  className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
                >
                  {meta.actionLabel}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}
