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
  gemPoints: number;
  contributionRank: string;
  /** @deprecated Database compatibility alias. Use gemPoints. */
  reviewerPoints: number;
  /** @deprecated Legacy reviewer/affiliate rank. Use contributionRank. */
  reviewerRank: string;
  pointTransactions: PointTransaction[];
};

export const CUSTOMER_CONTRIBUTION_UPDATED_EVENT =
  "ufind:customer-contribution-updated";

export function notifyCustomerContributionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOMER_CONTRIBUTION_UPDATED_EVENT));
  }
}

export function subscribeToCustomerContributionUpdates(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(CUSTOMER_CONTRIBUTION_UPDATED_EVENT, listener);
  return () =>
    window.removeEventListener(CUSTOMER_CONTRIBUTION_UPDATED_EVENT, listener);
}

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
