import { api } from "@/lib/axios";
import type { ApiResponse, Category } from "@/shared/types";

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
