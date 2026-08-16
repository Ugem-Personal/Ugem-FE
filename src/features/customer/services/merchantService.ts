import { api } from "@/lib/axios";
import { getCurrentUser } from "@/features/auth";
import type { Merchant, MerchantDetail } from "../types";
import { getRawUnderratedScore } from "../utils/underratedScore";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PageResult<T> = {
  items: T[];
  totalItems: number;
  pageSize: number;
  pageIndex: number;
};

type MerchantListResponse = Merchant[] | PageResult<Merchant>;
type MerchantListApiPayload =
  | MerchantListResponse
  | ApiResponse<MerchantListResponse>;
function unwrapApiData<T>(payload: T | ApiResponse<T>): T {
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

function unwrapMerchantList(payload: MerchantListApiPayload) {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object" && data !== null && "items" in data) {
    return data.items ?? [];
  }

  return [];
}

function extractDescriptionField(
  description: string | undefined,
  label: string,
) {
  if (!description) return "";
  const prefix = `${label}:`;
  return (
    description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))
      ?.slice(prefix.length)
      .trim() ?? ""
  );
}

function merchantMatchesKeyword(merchant: Merchant, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [
    merchant.name,
    merchant.description,
    merchant.address,
    merchant.menu
      ?.map((item) => `${item.name} ${item.description ?? ""}`)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

function mergeMerchantData(
  summary: Merchant,
  detail?: MerchantDetail | null,
): Merchant {
  const description = detail?.description || summary.description;
  const underratedScore =
    getRawUnderratedScore(summary) ?? getRawUnderratedScore(detail);

  return {
    ...detail,
    ...summary,
    address:
      detail?.address ||
      summary.address ||
      extractDescriptionField(description, "Địa chỉ"),
    description,
    email: detail?.email || summary.email,
    phone: detail?.phone || summary.phone,
    logoUrl: detail?.logoUrl || summary.logoUrl,
    menu: detail?.menu ?? summary.menu,
    latitude: summary.latitude ?? detail?.latitude,
    longitude: summary.longitude ?? detail?.longitude,
    lat: summary.lat ?? detail?.lat,
    lng: summary.lng ?? detail?.lng,
    rating: summary.rating ?? detail?.rating,
    underratedScore: underratedScore ?? undefined,
    distance: summary.distance ?? detail?.distance,
    hasActiveCampaign: summary.hasActiveCampaign ?? detail?.hasActiveCampaign,
    featuredFoods: summary.featuredFoods ?? detail?.featuredFoods,
    recommendationScore: summary.recommendationScore ?? detail?.recommendationScore,
  };
}

async function getMerchantDetailSafe(id: string) {
  try {
    return await getMerchantDetail(id);
  } catch {
    return null;
  }
}

export async function findMerchantByFoodId(foodId: string) {
  const response = await api.get<
    ApiResponse<{ merchant?: { id: string } }> | { merchant?: { id: string } }
  >(`/foods/${foodId}`);
  const food = unwrapApiData(response.data);
  return food.merchant?.id ? getMerchantDetail(food.merchant.id) : null;
}

export async function getNearbyMerchants(params: {
  latitude: number;
  longitude: number;
  keyword?: string;
  categoryId?: string;
  priceRange?: string;
  restaurantType?: string;
  mainDishType?: string;
  radiusKm?: number;
}) {
  const usesCategory = Boolean(params.categoryId);
  const res = await api.request<MerchantListApiPayload>({
    method: "get",
    url: usesCategory ? "/merchants/by-category" : "/merchants",
    params: {
      search: params.keyword,
      categoryId: params.categoryId,
      priceRange: params.priceRange,
      restaurantType: params.restaurantType,
      mainDishType: params.mainDishType,
      pageIndex: 1,
      pageSize: 100,
      latitude: params.latitude,
      longitude: params.longitude,
      radiusKm: params.radiusKm ?? 15,
    },
  });

  const summaries = unwrapMerchantList(res.data);
  const summaryById = new Map(summaries.map((item: Merchant) => [item.id, item]));
  const ids = Array.from(summaryById.keys()).filter((id): id is string => Boolean(id));

  const details = await Promise.all(ids.map((id: string) => getMerchantDetailSafe(id)));
  const detailById = new Map(
    details
      .filter((item): item is MerchantDetail => item !== null)
      .map((item) => [item.id, item]),
  );

  return summaries
    .map((summary: Merchant) => mergeMerchantData(summary, detailById.get(summary.id)))
    .filter((merchant: Merchant) =>
      merchantMatchesKeyword(merchant, params.keyword ?? ""),
    );
}

export async function searchMerchants(params?: {
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  const res = await api.request<MerchantListApiPayload>({
    method: "get",
    url: "/merchants",
    params: {
      search: params?.keyword?.trim() || undefined,
      pageIndex: params?.pageIndex ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });

  return unwrapMerchantList(res.data);
}

export async function getMerchantDetail(id: string): Promise<MerchantDetail> {
  const [merchantResponse, foodsResponse] = await Promise.all([
    api.get<ApiResponse<MerchantDetail> | MerchantDetail>(`/merchants/${id}`),
    api.get<
      ApiResponse<MerchantDetail["foods"]> | MerchantDetail["foods"]
    >(`/foods/merchant/${id}`),
  ]);

  const merchant = unwrapApiData(merchantResponse.data);
  const foods = unwrapApiData(foodsResponse.data) ?? [];

  return {
    ...merchant,
    foods,
    menu: foods,
  };
}

export async function incrementMerchantView(
  id: string,
  source: string = "Recommendation",
) {
  const res = await api.post<ApiResponse<string | null> | string | null>(
    `/merchants/${id}/views`,
    { source },
  );
  return unwrapApiData(res.data);
}

/**
 * Use the merchant map endpoint from the backend contract.
 */
export async function getMapMerchants(payload: unknown) {
  const res = await api.request<MerchantListApiPayload>({
    method: "get",
    url: "/merchants/map",
    params: payload,
  });

  return unwrapMerchantList(res.data);
}

export async function getMerchantsByCategory(payload: unknown) {
  const res = await api.request<MerchantListApiPayload>({
    method: "get",
    url: "/merchants/by-category",
    params: payload,
  });

  return unwrapMerchantList(res.data);
}

export async function getMerchantMe() {
  const merchantId = getCurrentUser()?.MerchantId;
  if (!merchantId) return null;

  return getMerchantDetail(merchantId);
}
