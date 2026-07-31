import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/features/auth";
import type { Application } from "../types";
import { getStaffApplications } from "../services/applicationService";

type ApiError = {
  response?: {
    status?: number;
  };
};

export function getApplicationsQueryKey(role?: string) {
  return ["applications", role?.toLowerCase() ?? "unknown"] as const;
}

export function useStaffApplications() {
  const currentUserRole = getCurrentUser()?.Role;

  return useQuery<Application[]>({
    queryKey: getApplicationsQueryKey(currentUserRole),
    queryFn: getStaffApplications,
    retry: (failureCount, error) => {
      const apiError = error as ApiError;
      if (apiError?.response?.status === 404) return false; // Don't retry 404
      return failureCount < 3;
    },
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
  });
}
