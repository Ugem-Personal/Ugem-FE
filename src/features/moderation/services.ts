import { api } from "@/lib/axios";

export type IncidentType =
  | "FoodSafety"
  | "Hygiene"
  | "Fraud"
  | "WrongInformation"
  | "BadService"
  | "Other";
export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export async function reportMerchantIncident(input: {
  merchantId: string;
  type: IncidentType;
  severity?: IncidentSeverity;
  description: string;
  evidenceUrls?: string[];
}) {
  const response = await api.post("/moderation/incidents", input);
  return response.data.data;
}

export async function submitMerchantClaim(input: {
  merchantId: string;
  evidenceUrls?: string[];
}) {
  const response = await api.post("/moderation/claims", input);
  return response.data.data;
}

export async function requestMerchantRemoval(input: {
  merchantId: string;
  reason: string;
}) {
  const response = await api.post("/moderation/removal-requests", input);
  return response.data.data;
}

export async function suggestRestaurant(input: {
  name: string;
  address: string;
  category?: string;
  recommendedDish?: string;
  description?: string;
  images?: string[];
  reason: string;
}) {
  const response = await api.post("/moderation/suggestions", input);
  return response.data.data;
}

export async function disputeCheckIn(checkInId: string, reason?: string) {
  const response = await api.post(`/check-ins/${checkInId}/dispute`, {
    reason,
  });
  return response.data.data;
}
