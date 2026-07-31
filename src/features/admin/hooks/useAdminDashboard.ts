import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAdminDashboard,
  getAdminMerchantRevenues,
} from "../services/adminService";
import type { AdminMerchantRevenue } from "../services/adminService";

export const ADMIN_DASHBOARD_QUERY_KEY = ["admin", "dashboard"] as const;
export const ADMIN_MERCHANT_REVENUES_QUERY_KEY = [
  "admin",
  "merchant-revenues",
] as const;

export function useAdminDashboard() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: getAdminDashboard,
  });
}

export function useAdminMerchantRevenues(params: {
  searchTerm?: string;
  pageIndex: number;
  pageSize: number;
}) {
  return useQuery<AdminMerchantRevenue[]>({
    queryKey: [
      ...ADMIN_MERCHANT_REVENUES_QUERY_KEY,
      params.searchTerm ?? "",
      params.pageIndex,
      params.pageSize,
    ],
    queryFn: () => getAdminMerchantRevenues(params),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
