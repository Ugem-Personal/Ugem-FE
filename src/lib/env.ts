const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.toString().trim().replace(/\/+$/, "") || "";

const cleanBase = rawApiBaseUrl.replace(/\/api\/v1$/, "").replace(/\/api$/, "");

export const API_BASE_URL = cleanBase;

export const API_V1_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : cleanBase
    ? `${cleanBase}/api/v1`
    : "/api/v1";
