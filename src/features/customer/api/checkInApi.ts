import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type VerifyDirectQrPayload = {
  checkInToken: string;
  latitude: number;
  longitude: number;
};

export type VerifiedCheckInResult = {
  checkInId: string;
  merchant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
  campaignId: string | null;
  checkedInAt: string;
  distanceMeters: number;
  pointsAwarded: number;
  gemPointsAwarded: number;
  status: string;
};

export type CustomerCheckInCode = {
  customerId: string;
  customerCode: string;
  qrDataUrl: string;
  fullName: string;
  phoneNumber?: string | null;
  gemPoints?: number;
  contributionRank?: string | null;
  reviewerPoints?: number;
  reviewerRank?: string | null;
  activeBenefits: string[];
};

export async function verifyDirectQr(
  payload: VerifyDirectQrPayload,
): Promise<VerifiedCheckInResult> {
  const response = await api.post<ApiResponse<VerifiedCheckInResult>>(
    "/check-in/verify",
    payload,
  );

  return response.data.data;
}

export async function getCustomerCheckInCode(): Promise<CustomerCheckInCode> {
  const response = await api.get<ApiResponse<CustomerCheckInCode>>(
    "/check-in/my-code",
  );

  return response.data.data;
}
