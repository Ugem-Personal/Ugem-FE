import { api } from "@/lib/axios";
import { getCurrentUser } from "@/features/auth";
import type { Merchant, MerchantDetail } from "../types";
import {
  getDisplayUnderratedScore,
  getRawUnderratedScore,
} from "../utils/underratedScore";

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
type MerchantRecord = Record<string, unknown>;
type RankedMerchant = {
  merchant: Merchant;
  sourceIndex: number;
};
const MAX_NEARBY_DISTANCE_KM = 15;

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

function getNumberField(record: MerchantRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getMerchantCoords(
  merchant: Merchant,
): { lat: number; lng: number } | null {
  const record = merchant as MerchantRecord;
  const lat = getNumberField(record, ["latitude", "lat", "Latitude", "Lat"]);
  const lng = getNumberField(record, ["longitude", "lng", "Longitude", "Lng"]);

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function getUnderratedScore(merchant?: Merchant | null) {
  return getDisplayUnderratedScore(merchant)?.score ?? null;
}

function getDistanceValue(merchant: Merchant) {
  return typeof merchant.distance === "number" && Number.isFinite(merchant.distance)
    ? merchant.distance
    : Number.POSITIVE_INFINITY;
}

function compareNearbyMerchantRank(a: RankedMerchant, b: RankedMerchant) {
  const scoreA = getUnderratedScore(a.merchant);
  const scoreB = getUnderratedScore(b.merchant);

  if (scoreA !== null || scoreB !== null) {
    const byUnderrated =
      (scoreB ?? Number.NEGATIVE_INFINITY) -
      (scoreA ?? Number.NEGATIVE_INFINITY);

    if (byUnderrated !== 0) return byUnderrated;

    const distanceA = getDistanceValue(a.merchant);
    const distanceB = getDistanceValue(b.merchant);

    if (distanceA !== distanceB) return distanceA - distanceB;
  }

  return a.sourceIndex - b.sourceIndex;
}

function calculateDistanceKm(
  userLat: number,
  userLng: number,
  merchantLat: number,
  merchantLng: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRad(merchantLat - userLat);
  const dLng = toRad(merchantLng - userLng);
  const lat1 = toRad(userLat);
  const lat2 = toRad(merchantLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function attachClientDistance(
  merchant: Merchant,
  latitude: number,
  longitude: number,
): Merchant {
  const coords = getMerchantCoords(merchant);
  if (!coords) return merchant;

  return {
    ...merchant,
    distance: calculateDistanceKm(latitude, longitude, coords.lat, coords.lng),
  };
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
}) {
  const usesCategory = Boolean(params.categoryId);
  const res = await api.request<MerchantListApiPayload>({
    method: "get",
    url: usesCategory ? "/merchants/by-category" : "/merchants",
    params: {
      search: params.keyword,
      categoryId: params.categoryId,
      pageIndex: 1,
      pageSize: 100,
      latitude: params.latitude,
      longitude: params.longitude,
    },
  });

  const summaries = unwrapMerchantList(res.data);
  const summaryById = new Map(summaries.map((item) => [item.id, item]));
  const ids = Array.from(summaryById.keys()).filter(Boolean);

  const details = await Promise.all(ids.map((id) => getMerchantDetailSafe(id)));
  const detailById = new Map(
    details
      .filter((item): item is MerchantDetail => item !== null)
      .map((item) => [item.id, item]),
  );

  return ids
    .map((id, sourceIndex) => ({
      merchant: mergeMerchantData(summaryById.get(id)!, detailById.get(id)),
      sourceIndex,
    }))
    .filter(({ merchant }) =>
      merchantMatchesKeyword(merchant, params.keyword ?? ""),
    )
    .map(({ merchant, sourceIndex }) => ({
      merchant: attachClientDistance(
        merchant,
        params.latitude,
        params.longitude,
      ),
      sourceIndex,
    }))
    .filter(
      ({ merchant }) =>
        typeof merchant.distance === "number" &&
        Number.isFinite(merchant.distance) &&
        merchant.distance <= MAX_NEARBY_DISTANCE_KM,
    )
    .sort(compareNearbyMerchantRank)
    .map(({ merchant }) => merchant);
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

export async function incrementMerchantView(id: string) {
  const res = await api.post<ApiResponse<string | null> | string | null>(
    `/merchants/${id}/views`,
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
