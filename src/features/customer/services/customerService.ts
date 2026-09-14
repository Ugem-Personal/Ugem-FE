import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";
import type { CustomerProfile } from "../types";

export async function getCustomerProfile() {
  const { data } =
    await api.get<ApiResponse<CustomerProfile | CustomerProfile[]>>(
      "/user/profile",
    );

  return Array.isArray(data.data) ? (data.data[0] ?? null) : data.data;
}

export async function updateCustomerProfile(payload: {
  fullName?: string;
  avatarUrl?: string;
}) {
  const { data } = await api.patch<ApiResponse<null>>("/user/profile", {
    fullName: payload.fullName,
    avatarUrl: payload.avatarUrl,
  });

  return data;
}

export async function confirmOrderReceived(orderId: string) {
  const { data } = await api.patch<ApiResponse<null>>(
    `/orders/${orderId}/status`,
    {
      status: "Completed",
    },
  );

  return data;
}

export async function confirmOrderNotReceived(orderId: string) {
  const { data } = await api.patch<ApiResponse<null>>(
    `/orders/${orderId}/status`,
    {
      status: "NotReceived",
    },
  );

  return data;
}

export type PointTransaction = {
  id: string;
  reviewerId: string;
  amount: number;
  pointsAfter: number;
  type: string;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type ReviewerProfileData = {
  reviewerPoints: number;
  reviewerRank: string;
  pointTransactions: PointTransaction[];
};

export async function getReviewerProfile() {
  const { data } = await api.get<ApiResponse<ReviewerProfileData>>(
    "/customers/reviewer-profile",
  );
  return data.data;
}

export type RedeemedVoucher = {
  id: string;
  code: string;
  title: string;
  discountValue: number;
  minOrderAmount: number;
  pointsSpent: number;
  isUsed?: boolean;
  createdAt: string;
};

export type RedeemVoucherResponse = {
  voucherCode: string;
  voucherTier: string;
  title: string;
  discountValue: number;
  minOrderAmount: number;
  pointsCost: number;
  remainingPoints: number;
  createdAt: string;
};

export async function redeemVoucher(voucherTier: string) {
  const { data } = await api.post<ApiResponse<RedeemVoucherResponse>>(
    "/customers/redeem-voucher",
    { voucherTier },
  );
  return data.data;
}

export async function getMyRedeemedVouchers() {
  const { data } = await api.get<ApiResponse<RedeemedVoucher[]>>(
    "/customers/my-vouchers",
  );
  return data.data;
}


