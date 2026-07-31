import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type FoodTopping = {
  id?: string;
  name?: string;
  price?: number;
  foodId?: string;
};

export type CreateFoodToppingRequest = {
  foodId: string;
  name: string;
  price: number;
};

export type UpdateFoodToppingRequest = {
  foodToppingId: string;
  name?: string;
  price?: number;
};

export async function createFoodTopping(payload: CreateFoodToppingRequest) {
  const res = await api.post<ApiResponse<null>>("/food-toppings", payload);
  return res.data;
}

export async function getFoodToppings(foodId: string) {
  const res = await api.get<ApiResponse<FoodTopping[]>>(
    `/food-toppings/${foodId}/toppings`,
  );
  return res.data.data ?? [];
}

export async function updateFoodTopping(payload: UpdateFoodToppingRequest) {
  const res = await api.put<ApiResponse<null>>("/food-toppings", payload);
  return res.data;
}

export async function deleteFoodTopping(foodToppingId: string) {
  const res = await api.delete<ApiResponse<null>>(
    `/food-toppings/${foodToppingId}`,
  );
  return res.data;
}
