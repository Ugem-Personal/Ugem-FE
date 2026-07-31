import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStaffMerchantList } from "../services/merchantService";
import type { PageResult, StaffMerchant } from "../services/merchantService";

export function useStaffMerchantList(params: {
  searchTerm?: string;
  pageIndex: number;
  pageSize: number;
}) {
  return useQuery<PageResult<StaffMerchant>>({
    queryKey: [
      "staff",
      "merchants",
      params.searchTerm ?? "",
      params.pageIndex,
      params.pageSize,
    ],
    queryFn: () => getStaffMerchantList(params),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
