import { api } from "@/lib/axios";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Admin = {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

function unwrapData<T>(payload: ApiResponse<T> | T | null | undefined) {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload as T;
}

export async function getAdmins() {
  const { data } = await api.get<ApiResponse<Admin[]> | Admin[]>("/admin/staff");
  return unwrapData(data) ?? [];
}

export async function getAdminById(id: string) {
  const { data } = await api.get<ApiResponse<Admin> | Admin>(
    `/admin/staff/${id}`,
  );
  return unwrapData(data);
}

export async function createAdmin(payload: unknown) {
  const { data } = await api.post<ApiResponse<null> | null>(
    "/admin/staff",
    payload,
  );
  return data;
}

export type AdminDashboard = {
  totalUsers: number;
  totalMerchants: number;
  totalRevenue: number;
  totalPlatformFee: number;
  totalReviewerFee: number;
  totalCompletedOrders: number;
  averageOrderValue: number;
  newUsersToday: number;
  pendingApplications: number;
  pendingReviewerApplications: number;
  totalOrders?: number;
};

export type AdminMerchantRevenue = {
  merchantId: string;
  merchantName: string;
  logoUrl?: string | null;
  completedOrders: number;
  totalRevenue: number;
  platformFee: number;
  reviewerFee: number;
  merchantReceive: number;
  averageOrderValue: number;
  lastOrderAt?: string | null;
  revenueGrowth: number;
};

export type AdminRevenueByPeriod = {
  period: string;
  periodType: string;
  revenue: number;
  orderCount: number;
};

export type AdminTopFood = {
  foodId: string;
  foodName: string;
  totalSold: number;
  totalRevenue: number;
};

export type AdminMerchantRevenueDetail = {
  merchantId: string;
  merchantName: string;
  logoUrl?: string | null;
  totalRevenue: number;
  platformFee: number;
  reviewerFee: number;
  merchantReceive: number;
  averageOrderValue: number;
  pendingOrders: number;
  acceptedOrders: number;
  rejectedOrders: number;
  completedOrders: number;
  cancellationRate: number;
  totalUniqueCustomers: number;
  lastOrderAt?: string | null;
  revenueChart: AdminRevenueByPeriod[];
  topFoods: AdminTopFood[];
};

export type AuditLog = {
  id: string;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type AuditLogPage = {
  items: AuditLog[];
  totalItems: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
};

const EMPTY_ADMIN_DASHBOARD: AdminDashboard = {
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

export async function getAdminDashboard() {
  const { data } = await api.get<
    ApiResponse<AdminDashboard> | AdminDashboard
  >("/admin/dashboard");

  return unwrapData(data) ?? EMPTY_ADMIN_DASHBOARD;
}

export async function getAdminMerchantRevenues(params?: {
  searchTerm?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  const requestConfig = {
    params: {
      searchTerm: params?.searchTerm || undefined,
      pageIndex: params?.pageIndex ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  };

  const { data } = await api.get<
    ApiResponse<AdminMerchantRevenue[]> | AdminMerchantRevenue[]
  >("/admin/merchant-revenues", requestConfig);

  return unwrapData(data) ?? [];
}

export async function getAdminMerchantRevenueDetail(
  merchantId: string,
  periodType: "Day" | "Week" | "Month" | "Year" | string = "Month",
) {
  const requestConfig = {
    params: { periodType },
  };

  const { data } = await api.get<
    ApiResponse<AdminMerchantRevenueDetail> | AdminMerchantRevenueDetail
  >(`/admin/merchant-revenues/${merchantId}`, requestConfig);

  return unwrapData(data);
}

export async function getAdminAuditLogs(params?: {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<ApiResponse<AuditLogPage> | AuditLogPage>(
    "/admin/audit-logs",
    {
      params: {
        search: params?.search || undefined,
        pageIndex: params?.pageIndex ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    },
  );

  return unwrapData(data);
}
