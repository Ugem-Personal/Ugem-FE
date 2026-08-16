import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type GenerateQrParams = {
  orderId: string;
};

export async function generateCheckInQr(params: GenerateQrParams) {
  const res = await api.get<Blob>("/check-in/generate-qr", {
    params,
    responseType: "blob",
  });

  return res.data;
}

export type CheckInRequest = {
  orderId: string;
  checkInToken: string;
  latitude: number;
  longitude: number;
};

export async function verifyCheckIn(payload: CheckInRequest) {
  const res = await api.post<ApiResponse<null>>("/check-in/verify", payload);
  return res.data;
}

export async function getCurrentCheckIns() {
  const res = await api.get<ApiResponse<unknown>>("/check-in/current");
  return res.data.data ?? null;
}

export type MerchantCheckInStatistics = {
  totalCheckIns: number;
  verifiedVisits: number;
  todayCheckIns: number;
  customersOverTime?: {
    date: string;
    totalCheckIns: number;
    uniqueCustomers: number;
  }[];
  abnormalCheckIns?: {
    id: string;
    action: string;
    orderId?: string | null;
    actorUserId?: string | null;
    createdAt: string;
    metadata?: unknown;
  }[];
};

export async function getMerchantCheckInStatistics() {
  const res = await api.get<ApiResponse<MerchantCheckInStatistics>>(
    "/check-in/merchant/statistics",
  );
  return res.data.data ?? null;
}

export async function getMerchantCheckInHistory() {
  const res = await api.get<ApiResponse<unknown[]>>("/check-in/merchant/history");
  return res.data.data ?? [];
}
