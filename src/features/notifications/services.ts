import { api } from "@/lib/axios";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type NotificationItem = {
  id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  isRead?: boolean;
  actionUrl?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  metadata?: Record<string, unknown>;
};

export async function getNotifications() {
  const res = await api.get<ApiResponse<NotificationItem[]>>("/notifications");
  return res.data.data ?? [];
}

export async function getUnreadNotificationCount() {
  const res = await api.get<ApiResponse<{ unreadCount: number }>>(
    "/notifications/unread-count",
  );
  return res.data.data?.unreadCount ?? 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const res = await api.patch<ApiResponse<null>>(
    `/notifications/${notificationId}/read`,
  );

  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch<ApiResponse<null>>("/notifications/read-all");

  return res.data;
}
