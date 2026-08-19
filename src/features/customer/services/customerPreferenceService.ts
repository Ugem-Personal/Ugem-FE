import { api } from "@/lib/axios";

export type CustomerPreferences = {
  preferredRestaurantTypes: string[];
  preferredMainDishTypes: string[];
  preferredCategoryIds: string[];
  preferredPriceRanges: string[];
};

export async function getCustomerPreferences(): Promise<CustomerPreferences> {
  const response = await api.get("/customers/preferences");
  return response.data.data;
}

export async function updateCustomerPreferences(
  data: CustomerPreferences,
): Promise<CustomerPreferences> {
  const response = await api.patch("/customers/preferences", data);
  return response.data.data;
}
