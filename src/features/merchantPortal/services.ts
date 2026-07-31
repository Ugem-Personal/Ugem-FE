import { api } from "../../lib/axios";
import { getCurrentUser } from "@/features/auth";
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

export function getCurrentMerchantId() {
  return getCurrentUser()?.MerchantId ?? null;
}

export async function getMyMerchantDetail() {
  const merchantId = getCurrentMerchantId();

  if (!merchantId) {
    return null;
  }

  const res = await api.get<ApiResponse<MerchantDetail> | MerchantDetail>(
    `/merchants/${merchantId}`,
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
  >("/orders");
  return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
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
