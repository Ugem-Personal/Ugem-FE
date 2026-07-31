import { useEffect, useState, type MouseEvent } from "react";
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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

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
    const unreadNotifications = notifications.filter((item) => !item.isRead);

    if (unreadNotifications.length === 0) return;

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

    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      void loadNotifications(false);
    });
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "relative h-10 w-10 rounded-full border-cyan-100 bg-white/90 p-0 text-cyan-700 shadow-sm hover:bg-cyan-50",
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

      <DropdownMenuContent align="end" className="w-104 rounded-2xl p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-900">
              Thông báo
            </DropdownMenuLabel>
            <p className="text-xs text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Tất cả thông báo của tài khoản hiện tại"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleMarkAllAsRead()}
              className="h-8 gap-1.5 px-2 text-xs text-slate-600 hover:text-cyan-700"
              disabled={loading || unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadNotifications()}
              className="h-8 gap-1.5 px-2 text-xs text-slate-600"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Làm mới
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300" />
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

        <DropdownMenuSeparator />

        <div className="p-3">
          <Button
            asChild
            className="h-11 w-full justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-cyan-900/20 active:translate-y-0"
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
    getNotificationText(item).includes("approved");

  const handleActionClick = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
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
        item.isRead ? "border-slate-200 bg-white" : tone.border,
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

          <p className="mt-1 text-sm font-black text-slate-950">
            {getNotificationTitle(item)}
          </p>

          {body ? (
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">
              {body}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
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
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 hover:text-cyan-700"
                >
                  Đã đọc
                </button>
              ) : null}
              {meta.actionTo ? (
                <Link
                  to={meta.actionTo}
                  onClick={handleActionClick}
                  className="inline-flex items-center gap-1 text-cyan-700"
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
