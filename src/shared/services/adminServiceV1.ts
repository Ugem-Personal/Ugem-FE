import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type StaffSummary = {
  id?: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
  hiredAt?: string;
  createdAt?: string;
};

export type CreateStaffRequest = {
  email: string;
  fullName: string;
  password: string;
  phoneNumber: string;
};

export async function getAdminStaff(params?: {
  searchTerm?: string;
  pageSize?: number;
  pageIndex?: number;
}) {
  const res = await api.get<ApiResponse<unknown>>("/admin/staff", { params });
  return res.data.data ?? null;
}

export async function createAdminStaff(payload: CreateStaffRequest) {
  const res = await api.post<ApiResponse<null>>("/admin/staff", payload);
  return res.data;
}

export async function deleteAdminStaff(staffId: string) {
  const res = await api.delete<ApiResponse<null>>(`/admin/staff/${staffId}`);
  return res.data;
}

export type AdminDashboard = {
  totalUsers: number;
  totalMerchants: number;
  totalOrders: number;
  totalRevenue: number;
  newUsersToday: number;
  pendingApplications: number;
  pendingReviewerApplications: number;
};

export async function getAdminDashboardV1() {
  const res = await api.get<ApiResponse<AdminDashboard>>("/admin/dashboard");
  return res.data.data ?? null;
}
