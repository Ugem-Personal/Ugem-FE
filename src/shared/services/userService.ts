import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";
import { getCurrentUser, updateStoredUser } from "@/features/auth";

export type UserProfile = {
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role?: string;
  createdAt?: string;
};

export async function getUserProfile() {
  const { data } = await api.get<ApiResponse<UserProfile>>("/user/profile");
  return data.data ?? null;
}

export async function updateUserProfile(payload: {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}) {
  const user = getCurrentUser();

  const { data } = await api.patch<ApiResponse<UserProfile>>("/user/profile", {
    fullName: payload.fullName,
    phoneNumber: payload.phoneNumber,
    avatarUrl: payload.avatarUrl,
  });

  updateStoredUser({
    Name: payload.fullName?.trim() || user?.Name,
    AvatarUrl: payload.avatarUrl,
  });

  return data;
}
