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

export async function getDiscoveryOptions() {
  discoveryOptionsRequest ??= api
    .get<ApiResponse<DiscoveryOptions>>("/categories/discovery-options")
    .then(({ data }) => data.data)
    .catch((error) => {
      discoveryOptionsRequest = null;
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
