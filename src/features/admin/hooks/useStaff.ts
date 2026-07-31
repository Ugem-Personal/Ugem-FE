import { useQuery } from "@tanstack/react-query";
import { getStaffList, getStaffById } from "../services/staffService";

export const STAFF_LIST_QUERY_KEY = ["admin", "staff", "list"] as const;

export function useStaffList() {
  return useQuery({
    queryKey: STAFF_LIST_QUERY_KEY,
    queryFn: getStaffList,
  });
}

export function useStaffById(id: string) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffById(id),
    enabled: !!id,
  });
}
