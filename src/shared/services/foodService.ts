import { api } from "@/lib/axios";
import type {
  ApiResponse,
  CreateFoodRequest,
  CreateFoodResponse,
  Food,
} from "@/shared/types";

type FoodListPayload = Food[] | { items?: Food[] };

function unwrapFoodList(
  payload: FoodListPayload | ApiResponse<FoodListPayload>,
) {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const data = payload.data;
    return Array.isArray(data) ? data : (data.items ?? []);
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return "items" in payload && Array.isArray(payload.items)
    ? payload.items
    : [];
}

function unwrapFoodItem(payload: Food | ApiResponse<Food>) {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload;
}

export async function createFood(payload: CreateFoodRequest) {
  const { data } = await api.post<
    CreateFoodResponse | ApiResponse<CreateFoodResponse>
  >("/foods", payload);

  return unwrapFoodItem(data);
}

export async function getFoods() {
  const { data } = await api.get<
    ApiResponse<FoodListPayload> | FoodListPayload
  >("/foods");
  return unwrapFoodList(data);
}

export async function getFoodById(id: string) {
  const { data } = await api.get<ApiResponse<Food> | Food>(`/foods/${id}`);
  return unwrapFoodItem(data);
}

export async function deleteFood(id: string) {
  const { data } = await api.delete<ApiResponse<null>>(`/foods/${id}`);
  return data;
}

export async function updateFood(id: string, payload: Partial<CreateFoodRequest>) {
  const { data } = await api.put<ApiResponse<Food> | Food>(`/foods/${id}`, payload);
  return unwrapFoodItem(data);
}

export async function updateFoodAvailability(id: string, isAvailable: boolean) {
  const { data } = await api.patch<ApiResponse<Food> | Food>(
    `/foods/${id}/availability`,
    { isAvailable },
  );
  return unwrapFoodItem(data);
}
