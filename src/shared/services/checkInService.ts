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
};

export async function verifyCheckIn(payload: CheckInRequest) {
  const res = await api.post<ApiResponse<null>>("/check-in/verify", payload);
  return res.data;
}

export async function getCurrentCheckIns() {
  const res = await api.get<ApiResponse<unknown>>("/check-in/current");
  return res.data.data ?? null;
}
