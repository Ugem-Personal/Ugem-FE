import { api } from "@/lib/axios";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

function unwrapData<T>(payload: ApiResponse<T> | T | null | undefined) {
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

export type Campaign = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountValue: number;
  isPercentage: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  quantity: number;
  usedCount: number;
  maxUsagePerUser: number;
  isGlobal: boolean;
  isNewUserOnly: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string;
  merchantId?: string | null;
};

export type CreateCampaignPayload = {
  code: string;
  title: string;
  description?: string;
  discountValue: number;
  isPercentage: boolean;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  quantity: number;
  maxUsagePerUser: number;
  isGlobal: boolean;
  isNewUserOnly: boolean;
  startDate: string;
  endDate: string;
};

export type UpdateCampaignPayload = CreateCampaignPayload & {
  id: string;
  isActive: boolean;
};

export async function getCampaigns() {
  const { data } = await api.get<ApiResponse<Campaign[]> | Campaign[]>(
    "/campaigns",
  );

  return unwrapData(data) ?? [];
}

export async function getCampaignById(id: string) {
  const { data } = await api.get<ApiResponse<Campaign> | Campaign>(
    `/campaigns/${id}`,
  );

  return unwrapData(data);
}

export async function createCampaign(payload: CreateCampaignPayload) {
  const { data } = await api.post<ApiResponse<string> | string>(
    "/campaigns",
    payload,
  );

  return unwrapData(data);
}

export async function updateCampaign(payload: UpdateCampaignPayload) {
  const { data } = await api.put<ApiResponse<string> | string>(
    "/campaigns",
    payload,
  );

  return unwrapData(data);
}

export async function deleteCampaign(id: string) {
  const { data } = await api.delete<ApiResponse<string> | string>(
    `/campaigns/${id}`,
  );

  return unwrapData(data);
}
