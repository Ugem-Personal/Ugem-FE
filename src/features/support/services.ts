import { api } from "@/lib/axios";

export type SupportCategory =
  | "Orders"
  | "Delivery"
  | "Payment"
  | "Menu"
  | "Account"
  | "Other";
export type SupportPriority = "Low" | "Normal" | "High" | "Urgent";
export type SupportStatus =
  | "Open"
  | "InProgress"
  | "WaitingForMerchant"
  | "Resolved"
  | "Closed";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type SupportMessage = {
  id: string;
  message: string;
  attachmentUrl?: string | null;
  createdAt: string;
  sender?: { id: string; fullName: string; email: string; role: string };
};

export type SupportTicket = {
  id: string;
  merchantId: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  subject: string;
  description: string;
  orderId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  merchant?: { id: string; name: string } | null;
  createdBy?: { id: string; fullName: string; email: string; role: string };
  assignedStaff?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  messages: SupportMessage[];
};

function unwrap<T>(response: ApiResponse<T>) {
  return response.data;
}

export async function getMerchantSupportTickets() {
  const response =
    await api.get<ApiResponse<SupportTicket[]>>("/merchant/support");
  return unwrap(response.data);
}

export async function getMerchantSupportTicket(id: string) {
  const response = await api.get<ApiResponse<SupportTicket>>(
    `/merchant/support/${id}`,
  );
  return unwrap(response.data);
}

export async function createMerchantSupportTicket(payload: {
  category: SupportCategory;
  priority: SupportPriority;
  subject: string;
  description: string;
  orderId?: string;
}) {
  const response = await api.post<ApiResponse<SupportTicket>>(
    "/merchant/support",
    payload,
  );
  return unwrap(response.data);
}

export async function replyMerchantSupportTicket(id: string, message: string) {
  const response = await api.post<ApiResponse<SupportTicket>>(
    `/merchant/support/${id}/messages`,
    { message },
  );
  return unwrap(response.data);
}

export async function updateMerchantSupportStatus(
  id: string,
  status: "Open",
) {
  const response = await api.patch<ApiResponse<SupportTicket>>(
    `/merchant/support/${id}/status`,
    { status },
  );
  return unwrap(response.data);
}

export async function getStaffSupportTickets() {
  const response =
    await api.get<ApiResponse<SupportTicket[]>>("/staff/support");
  return unwrap(response.data);
}

export async function getStaffSupportTicket(id: string) {
  const response = await api.get<ApiResponse<SupportTicket>>(
    `/staff/support/${id}`,
  );
  return unwrap(response.data);
}

export async function assignStaffSupportTicket(id: string) {
  const response = await api.post<ApiResponse<SupportTicket>>(
    `/staff/support/${id}/assign`,
  );
  return unwrap(response.data);
}

export async function replyStaffSupportTicket(id: string, message: string) {
  const response = await api.post<ApiResponse<SupportTicket>>(
    `/staff/support/${id}/messages`,
    { message },
  );
  return unwrap(response.data);
}

export async function updateStaffSupportStatus(
  id: string,
  status: SupportStatus,
) {
  const response = await api.patch<ApiResponse<SupportTicket>>(
    `/staff/support/${id}/status`,
    { status },
  );
  return unwrap(response.data);
}
