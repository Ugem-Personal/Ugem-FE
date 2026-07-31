import { useQuery } from "@tanstack/react-query";
import { getMyApplications } from "../services";

export function useMyApplications() {
  return useQuery({
    queryKey: ["merchant-portal", "my-applications"],
    queryFn: getMyApplications,
    // Poll while user waits for status updates so Merchant sees accept/reject quickly
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}
