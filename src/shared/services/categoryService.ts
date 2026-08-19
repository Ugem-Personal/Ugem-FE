import { api } from "@/lib/axios";
import type { ApiResponse, Category, DiscoveryOptions } from "@/shared/types";

export const DEFAULT_DISCOVERY_OPTIONS: DiscoveryOptions = {
  restaurantTypes: [
    "Quán ăn gia đình",
    "Quán vỉa hè",
    "Nhà hàng nhỏ",
    "Cafe / Đồ uống",
    "Quán nhậu",
    "Xe đẩy / gánh hàng",
  ],
  priceRanges: ["Tiết kiệm", "Bình dân", "Tầm trung"],
  foodCategories: [],
};

let discoveryOptionsRequest: Promise<DiscoveryOptions> | null = null;
const DISCOVERY_OPTIONS_CACHE_KEY = "ugem.discovery-options.v1";

function readCachedDiscoveryOptions() {
  try {
    const cached = window.localStorage.getItem(DISCOVERY_OPTIONS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as DiscoveryOptions) : null;
  } catch {
    return null;
  }
}

function cacheDiscoveryOptions(options: DiscoveryOptions) {
  if (options.foodCategories.length === 0) return;
  try {
    window.localStorage.setItem(
      DISCOVERY_OPTIONS_CACHE_KEY,
      JSON.stringify(options),
    );
  } catch {
    // Storage can be unavailable in private browsing; the network result still works.
  }
}

export async function getDiscoveryOptions(forceRefresh = false) {
  if (forceRefresh) discoveryOptionsRequest = null;

  discoveryOptionsRequest ??= api
    .get<ApiResponse<DiscoveryOptions>>("/categories/discovery-options")
    .then(({ data }) => {
      const options = data.data;
      cacheDiscoveryOptions(options);
      return options;
    })
    .catch((error) => {
      discoveryOptionsRequest = null;
      const cached = readCachedDiscoveryOptions();
      if (cached?.foodCategories.length) return cached;
      throw error;
    });

  return discoveryOptionsRequest;
}

export async function getCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories");
  return data.data ?? [];
}

export async function getChildCategories(parentId: string) {
  const { data } = await api.get<ApiResponse<Category[]>>(
    `/categories/${parentId}/children`,
  );

  return data.data ?? [];
}

export async function createCategory(payload: {
  name: string;
  description: string;
  parentId?: string | null;
}) {
  const { data } = await api.post<ApiResponse<Category>>("/categories", {
    name: payload.name,
    description: payload.description,
    parentId: payload.parentId ?? null,
  });

  return data.data;
}
