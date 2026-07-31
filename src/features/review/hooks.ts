import { useQuery } from "@tanstack/react-query";
import {
  getReviewById,
  getReviewDetailsByMerchant,
  getReviews,
  getReviewsByMerchantId,
} from "./services";

export function useReviews(merchantId?: string) {
  return useQuery({
    queryKey: ["reviews", merchantId ?? "all"],
    queryFn: () => getReviews({ merchantId }),
  });
}

export function useReviewsByMerchant(merchantId?: string) {
  return useQuery({
    queryKey: ["reviews", "merchant", merchantId],
    queryFn: () => getReviewsByMerchantId(merchantId!),
    enabled: !!merchantId,
  });
}

export function useReviewById(id: string) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => getReviewById(id),
    enabled: !!id,
  });
}

export function useReviewDetailsByMerchant(reviewId?: string) {
  return useQuery({
    queryKey: ["review", "details", reviewId],
    queryFn: () => getReviewDetailsByMerchant(reviewId!),
    enabled: !!reviewId,
  });
}
