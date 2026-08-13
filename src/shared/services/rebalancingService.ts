import { api } from "@/lib/axios";
import type { ApiResponse } from "@/shared/types";

export type RebalancingMerchant = {
  id: string;
  name: string;
  rating: number;
  strengthIndex: number;
  underratedScore: number;
  recommendationRank: number | null;
  lastRebalancedAt: string | null;
};

export type RebalancingRunData = {
  id: string;
  status: "Running" | "Completed" | "Failed";
  merchantCount: number;
  increasedVisibility: number;
  decreasedVisibility: number;
  unchangedVisibility: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type RebalancingStatusData = {
  lastUpdatedAt: string | null;
  status: "Running" | "Completed" | "Failed" | "Idle";
  merchantCount: number;
  increasedVisibility: number;
  decreasedVisibility: number;
  unchangedVisibility: number;
  latestRun: RebalancingRunData | null;
  merchants: RebalancingMerchant[];
};

export async function getRebalancingStatus() {
  const res = await api.get<ApiResponse<RebalancingStatusData>>("/rebalancing/status");
  return res.data.data;
}

export async function runManualRebalancing() {
  const res = await api.post<ApiResponse<unknown>>("/rebalancing/run");
  return res.data;
}
