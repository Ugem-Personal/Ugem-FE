import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type GenerateQrParams = {
  /** Legacy order QR. Omit for a UFind DirectVisit QR. */
  orderId?: string;
  /** Optional campaign attribution embedded in a UFind DirectVisit token. */
  campaignId?: string;
};

export async function generateCheckInQr(params: GenerateQrParams = {}) {
  const res = await api.get<Blob>("/check-in/generate-qr", {
    params,
    responseType: "blob",
  });

  return res.data;
}

export type CheckInRequest = {
  /** Legacy order check-in. DirectVisit QR omits this field. */
  orderId?: string;
  checkInToken: string;
  latitude: number;
  longitude: number;
};

export async function verifyCheckIn(payload: CheckInRequest) {
  const res = await api.post<ApiResponse<null>>("/check-in/verify", payload);
  return res.data;
}

export async function getCurrentCheckIns() {
  const res = await api.get<ApiResponse<CustomerCheckIn[]>>("/check-in/current");
  return res.data.data ?? [];
}

export type CustomerCheckIn = {
  id: string;
  orderId: string | null;
  merchant: { id: string; name: string; logoUrl: string | null; address: string };
  amount: number;
  checkedInAt: string | null;
  verifiedAt: string | null;
  disputedAt: string | null;
  suspicious: boolean;
  suspiciousReason: string | null;
  status: "Pending" | "Verified" | "Rejected" | "Disputed" | "Expired";
};

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
