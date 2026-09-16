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

export async function getMyIncidents() {
  const response = await api.get("/moderation/incidents/mine");
  return response.data.data as Array<Record<string, unknown>>;
}

export async function getMyClaims() {
  const response = await api.get("/moderation/claims/mine");
  return response.data.data as Array<Record<string, unknown>>;
}

export async function getMyRemovalRequests() {
  const response = await api.get("/moderation/removal-requests/mine");
  return response.data.data as Array<Record<string, unknown>>;
}

export async function getMerchantIncidents() {
  const response = await api.get("/moderation/merchant/incidents");
  return response.data.data as Array<Record<string, unknown>>;
}

export async function updateModeratedMerchant(
  merchantId: string,
  input: Record<string, unknown>,
) {
  const response = await api.patch(`/moderation/admin/merchants/${merchantId}`, input);
  return response.data.data as Record<string, unknown>;
}

export async function getModerationQueue(kind: "incidents" | "claims" | "removal-requests" | "suggestions" | "suspicious-check-ins" | "merchants") {
  const response = await api.get(`/moderation/admin/${kind}`);
  return response.data.data as Array<Record<string, unknown>>;
}

export async function reviewModerationItem(
  kind: "incidents" | "claims" | "removal-requests" | "suggestions",
  id: string,
  input: Record<string, unknown>,
) {
  const response = await api.patch(`/moderation/admin/${kind}/${id}`, input);
  return response.data.data as Record<string, unknown>;
}
