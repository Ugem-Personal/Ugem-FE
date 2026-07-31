import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type CustomerSearchResult = {
  userId: string;
  customerId: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  role: "Customer" | "Reviewer";
  avatarUrl?: string | null;
};

export async function searchCustomersByEmail(email: string, limit = 10) {
  const res = await api.get<ApiResponse<CustomerSearchResult[]>>(
    "/customers/search-by-email",
    {
      params: {
        email,
        limit,
      },
    },
  );

  return res.data.data ?? [];
}

export async function searchCustomersByPhoneNumber(
  phoneNumber: string,
  limit = 10,
) {
  const res = await api.get<ApiResponse<CustomerSearchResult[]>>(
    "/customers/search-by-phone-number",
    {
      params: {
        phoneNumber,
        limit,
      },
    },
  );

  return res.data.data ?? [];
}
