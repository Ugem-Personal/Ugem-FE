import { api } from "../../lib/axios";
import type { ApiResponse, MerchantOrderSummary } from "@/shared/types";
import type { MerchantDetail } from "@/features/customer/types";
import type { CreateApplicationPayload, MerchantApplication } from "./types";
import {
  acceptMerchantOrder,
  rejectMerchantOrder,
} from "@/shared/services/merchantOrderService";
import { generateCheckInQr } from "@/shared/services/checkInService";

const APPLICATION_TYPE = "Merchant";

function normalizeApplicationStatus(
  status: MerchantApplication["status"],
): MerchantApplication["status"] {
  if (status === "Accepted" || status === "Accept") {
    return "Approved";
  }

  return status;
}

function normalizeApplication(
  application: MerchantApplication,
): MerchantApplication {
  return {
    ...application,
    status: normalizeApplicationStatus(application.status),
  };
}

function getOpeningHours(record: Record<string, unknown>) {
  const candidates = [
    record.openingHours,
    record.OpeningHours,
    record.openHours,
    record.OpenHours,
    record.openHour,
    record.OpenHour,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function unwrapApiResponse<T>(payload: T | ApiResponse<T>) {
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

function appendString(formData: FormData, key: string, value?: string | null) {
  formData.append(key, value?.trim() ?? "");
}

function appendNumber(formData: FormData, key: string, value: number) {
  formData.append(key, Number.isFinite(value) ? String(value) : "0");
}

function mapPayloadToFormData(payload: CreateApplicationPayload) {
  const formData = new FormData();

  appendString(formData, "name", payload.name);
  appendString(formData, "description", payload.description);
  appendString(formData, "restaurantType", payload.restaurantType);
  appendString(formData, "mainDishType", payload.mainDishType);
  appendString(formData, "priceRange", payload.priceRange);
  appendString(formData, "email", payload.email);
  appendString(formData, "phone", payload.phone);
  appendString(formData, "logoUrl", payload.logoUrl);
  appendString(formData, "openingHours", payload.openingHours);
  appendString(formData, "address", payload.address);
  appendNumber(formData, "latitude", payload.latitude);
  appendNumber(formData, "longitude", payload.longitude);

  payload.menu.forEach((menuItem, index) => {
    const prefix = `menu[${index}]`;
    appendString(formData, `${prefix}.name`, menuItem.name);
    appendString(formData, `${prefix}.description`, menuItem.description);
    appendNumber(formData, `${prefix}.price`, menuItem.price);
    appendString(formData, `${prefix}.imageUrl`, menuItem.imageUrl);
    appendString(formData, `${prefix}.category`, menuItem.category);
    appendString(formData, `${prefix}.cuisine`, menuItem.cuisine);
  });

  return formData;
}

function mapPayloadToJsonRequest(payload: CreateApplicationPayload) {
  return {
    type: APPLICATION_TYPE,
    name: payload.name,
    description: payload.description,
    restaurantType: payload.restaurantType || "",
    mainDishType: payload.mainDishType || "",
    priceRange: payload.priceRange || "",
    email: payload.email,
    phone: payload.phone,
    logoUrl: payload.logoUrl || "",
    openingHours: payload.openingHours,
    address: payload.address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    menu: payload.menu.map((m) => ({
      name: m.name,
      description: m.description,
      price: m.price,
      imageUrl: m.imageUrl || "",
      category: m.category || "",
      cuisine: m.cuisine || "",
    })),
  };
}

export async function createApplication(payload: CreateApplicationPayload) {
  const requestBody = mapPayloadToFormData(payload);
  const res = await api.post<ApiResponse<null>>("/applications", requestBody);
  return res.data;
}

export async function createMerchantApplication(
  payload: CreateApplicationPayload,
) {
  return createApplication(payload);
}

export async function resubmitApplication(
  applicationId: string,
  payload: CreateApplicationPayload,
) {
  const requestBody = mapPayloadToJsonRequest(payload);
  const res = await api.put<ApiResponse<null>>(
    `/applications/${applicationId}`,
    requestBody,
  );

  return res.data;
}

export async function getMyApplications() {
  const res =
    await api.get<ApiResponse<MerchantApplication[]>>("/applications/mine");
  return (res.data.data ?? []).map(normalizeApplication);
}

export async function getMyMerchantDetail() {
  const res = await api.get<ApiResponse<MerchantDetail> | MerchantDetail>(
    "/merchants/me",
  );

  const merchant = unwrapApiResponse(res.data);
  const record = merchant as Record<string, unknown>;

  return {
    ...merchant,
    openingHours: getOpeningHours(record),
    foods: merchant.foods ?? merchant.menu ?? [],
    menu: merchant.menu ?? merchant.foods ?? [],
  };
}

export async function getMerchantOrders() {
  const res = await api.get<
    ApiResponse<MerchantOrderSummary[]> | MerchantOrderSummary[]
  >("/orders", { params: { pageSize: 100 } });
  const orders = Array.isArray(res.data) ? res.data : (res.data.data ?? []);

  return orders.map((order) => {
    const rawOrder = order as MerchantOrderSummary & {
      customer?: { fullName?: string | null } | null;
      paymentStatus?: string;
    };

    return {
      ...order,
      finalPrice: Number(order.finalPrice ?? 0),
      paymentStatus: order.paymentStatus || rawOrder.paymentStatus || "Unpaid",
      customerName:
        order.customerName || rawOrder.customer?.fullName || "Khách hàng",
    };
  });
}

export async function getMerchantOrderDetail(orderId: string) {
  const res = await api.get<ApiResponse<unknown>>(`/orders/${orderId}`);
  return res.data.data;
}

export async function acceptOrder(orderId: string) {
  return acceptMerchantOrder(orderId);
}

export async function rejectOrder(orderId: string, reason: string) {
  return rejectMerchantOrder({ orderId, reason });
}

export async function updateMerchantOrderStatus(
  orderId: string,
  status: "Preparing" | "Ready" | "Delivering" | "Completed",
) {
  const res = await api.patch(`/orders/${orderId}/status`, { status });
  return res.data;
}

export async function confirmCashPayment(orderId: string) {
  const res = await api.patch(`/orders/${orderId}/cash/confirm`);
  return res.data;
}

export async function getMerchantCheckInQr(
  orderId: string,
  _billAlreadyConfirmed = false,
) {
  void _billAlreadyConfirmed;
  const blob = await generateCheckInQr({ orderId });
  return URL.createObjectURL(blob);
}

export type MerchantViewSummary = {
  merchantId: string;
  totalViews: number;
};

export type MerchantStatistics = {
  merchantId: string;
  merchantName: string;
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  platformFee?: number;
  reviewerFee?: number;
  merchantReceive?: number;
  avgOrderValue: number;
  underratedScore: number;
  platformFeePercent: number;
};

export async function getMyMerchantViews() {
  const res = await api.get<
    ApiResponse<MerchantViewSummary> | MerchantViewSummary
  >("/merchants/me/views");
  return unwrapApiResponse(res.data);
}

export async function getMyMerchantStatistics() {
  const res = await api.get<
    ApiResponse<MerchantStatistics> | MerchantStatistics
  >("/merchants/me/statistics");
  return unwrapApiResponse(res.data);
}

export type MerchantDashboardOverview = {
  merchant: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
  };
  orders: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    paid: number;
  };
  revenue: {
    total: number;
  };
  foods: {
    total: number;
  };
  campaigns: {
    total: number;
    active: number;
  };
};

export type MerchantRevenueByYear = {
  merchant: {
    id: string;
    name: string;
  };
  year: number;
  summary: {
    totalRevenue: number;
    totalPaidOrders: number;
  };
  months: {
    month: number;
    revenue: number;
    paidOrders: number;
  }[];
};

export type MerchantTopFoodItem = {
  rank: number;
  foodId: string;
  foodName: string;
  quantitySold: number;
  revenue: number;
};

export type MerchantTopFoods = {
  merchant: {
    id: string;
    name: string;
  };
  limit: number;
  items: MerchantTopFoodItem[];
};

export type MerchantCampaignPerformanceItem = {
  rank: number;
  campaignId: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  remainingUsage: number | null;
  totalOrders: number;
  paidOrders: number;
  completedPaidOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
  isActive: boolean;
  status: "Upcoming" | "Active" | "Expired" | "Disabled" | "OutOfUsage";
  startAt: string;
  endAt: string;
};

export type MerchantCampaignPerformance = {
  merchant: {
    id: string;
    name: string;
  };
  limit: number;
  items: MerchantCampaignPerformanceItem[];
};

export type MerchantOrderGrowthByYear = {
  merchant: {
    id: string;
    name: string;
  };
  year: number;
  summary: {
    totalOrders: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    paid: number;
  };
  months: {
    month: number;
    totalOrders: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    paid: number;
  }[];
};

export async function getMerchantDashboardOverview() {
  const res = await api.get<
    ApiResponse<MerchantDashboardOverview> | MerchantDashboardOverview
  >("/dashboard/merchant");
  return unwrapApiResponse(res.data);
}

export async function getMerchantRevenueByYear(year: number) {
  const res = await api.get<
    ApiResponse<MerchantRevenueByYear> | MerchantRevenueByYear
  >(`/dashboard/merchant/revenue?year=${year}`);
  return unwrapApiResponse(res.data);
}

export async function getMerchantTopFoods(limit = 5) {
  const res = await api.get<ApiResponse<MerchantTopFoods> | MerchantTopFoods>(
    `/dashboard/merchant/top-foods?limit=${limit}`,
  );
  return unwrapApiResponse(res.data);
}

export async function getMerchantCampaignPerformance(limit = 10) {
  const res = await api.get<
    ApiResponse<MerchantCampaignPerformance> | MerchantCampaignPerformance
  >(`/dashboard/merchant/campaign-performance?limit=${limit}`);
  return unwrapApiResponse(res.data);
}

export async function getMerchantOrderGrowthByYear(year: number) {
  const res = await api.get<
    ApiResponse<MerchantOrderGrowthByYear> | MerchantOrderGrowthByYear
  >(`/dashboard/merchant/order-growth?year=${year}`);
  return unwrapApiResponse(res.data);
}

export type UpdateMerchantPayload = {
  name?: string;
  description?: string;
  restaurantType?: string;
  mainDishType?: string;
  priceRange?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingHours?: string;
  logoUrl?: string;
};

export async function updateMerchant(payload: UpdateMerchantPayload) {
  const res = await api.put<ApiResponse<string | null>>("/merchants", payload);
  return res.data;
}

export async function updateBill(
  orderId: string,
  payload: {
    discount?: number;
    items?: { foodId: string; quantity?: number; unitPrice?: number }[];
  },
) {
  const body = { orderId, ...(payload ?? {}) };
  const res = await api.patch<ApiResponse<unknown> | unknown>(
    "/orders/bill",
    body,
  );
  return res.data;
}
