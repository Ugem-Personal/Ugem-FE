import { useQuery } from "@tanstack/react-query";
import {
  getMapMerchants,
  getMerchantsByCategory,
  getMerchantMe,
} from "../services/merchantService";

export function useMapMerchants(payload: unknown) {
  return useQuery({
    queryKey: ["merchant", "map", payload],
    queryFn: () => getMapMerchants(payload),
  });
}

export function useMerchantsByCategory(payload: unknown) {
  return useQuery({
    queryKey: ["merchant", "category", payload],
    queryFn: () => getMerchantsByCategory(payload),
  });
}

export function useMerchantMe() {
  return useQuery({
    queryKey: ["merchant", "me"],
    queryFn: getMerchantMe,
  });
}
