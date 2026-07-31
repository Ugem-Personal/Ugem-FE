import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type WishlistItem = {
  merchantId?: string;
  id?: string;
  name: string;
  logoUrl: string;
  rating: number;
};

export async function getWishlist() {
  const res = await api.get<ApiResponse<WishlistItem[]>>("/wishlists");
  return res.data.data ?? [];
}

export async function addWishlist(merchantId: string) {
  const res = await api.post<ApiResponse<[]>>("/wishlists", {
    merchantId,
  });

  return res.data.data ?? [];
}

export async function removeWishlist(merchantId: string) {
  const res = await api.delete<ApiResponse<null>>(`/wishlists/${merchantId}`);
  return res.data;
}
