const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.toString().trim();

export const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : "";

export const API_V1_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : API_BASE_URL
    ? `${API_BASE_URL}/api/v1`
    : "/api/v1";
