import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type ReviewerApplicationRequest = {
  motivation: string;
  experience?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  otherSocialUrl?: string;
};

export type UpdateReviewerApplicationRequest = ReviewerApplicationRequest & {
  reviewerApplicationId: string;
};

export type ReviewerApplication = {
  id?: string;
  motivation?: string;
  experience?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  otherSocialUrl?: string;
  status?: string;
  rejectionReason?: string;
  customerId?: string;
  createdAt?: string;
};

export async function createReviewerApplication(
  payload: ReviewerApplicationRequest,
) {
  const res = await api.post<ApiResponse<null>>(
    "/reviewer-application",
    payload,
  );
  return res.data;
}

export async function updateReviewerApplication(
  payload: UpdateReviewerApplicationRequest,
) {
  const res = await api.patch<ApiResponse<null>>(
    "/reviewer-application",
    payload,
  );
  return res.data;
}

export async function getMyReviewerApplication() {
  const res = await api.get<ApiResponse<ReviewerApplication>>(
    "/reviewer-application",
  );
  return res.data.data ?? null;
}
