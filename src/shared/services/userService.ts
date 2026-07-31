import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";
import { getCurrentUser, updateStoredUser } from "@/features/auth";

export type UserProfile = {
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  role?: string;
};

export async function getUserProfile() {
  const { data } = await api.get<ApiResponse<UserProfile>>("/user/profile");
  return data.data ?? null;
}

export async function updateUserProfile(payload: {
  fullName?: string;
  avatarUrl?: string;
}) {
  const user = getCurrentUser();

  const { data } = await api.patch<ApiResponse<UserProfile>>("/user/profile", {
    fullName: payload.fullName,
    avatarUrl: payload.avatarUrl,
  });

  updateStoredUser({
    Name: payload.fullName?.trim() || user?.Name,
    AvatarUrl: payload.avatarUrl,
  });

  return data;
}
