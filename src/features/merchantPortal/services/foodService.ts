import { api } from "@/lib/axios";
import type {
  CreateFoodPayload,
  CreateFoodResponse,
  Food,
  UpdateFoodPayload,
} from "../types";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function createFood(payload: CreateFoodPayload) {
  const { data } = await api.post<CreateFoodResponse>("/foods", payload);
  return data;
}

export async function getFoods() {
  const { data } = await api.get<ApiResponse<Food[]> | Food[]>("/foods");
  return Array.isArray(data) ? data : (data.data ?? []);
}

export async function getFoodById(id: string) {
  const { data } = await api.get<ApiResponse<Food> | Food>(`/foods/${id}`);

  return "data" in data ? data.data : data;
}

export async function deleteFood(id: string) {
  const { data } = await api.delete<ApiResponse<null>>(`/foods/${id}`);
  return data;
}

export async function updateFood(id: string, payload: UpdateFoodPayload) {
  const { data } = await api.put<ApiResponse<Food> | Food>(`/foods/${id}`, payload);
  return "data" in data ? data.data : data;
}

export async function updateFoodAvailability(id: string, isAvailable: boolean) {
  const { data } = await api.patch<ApiResponse<Food> | Food>(
    `/foods/${id}/availability`,
    { isAvailable },
  );
  return "data" in data ? data.data : data;
}
