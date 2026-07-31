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
