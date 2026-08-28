import axios from "axios";
import { API_V1_BASE_URL } from "./env";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  saveAuthToken,
} from "../features/auth/store";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    _retryAfterRefresh?: boolean;
  }
}

type RefreshResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    refreshTokenExpiresAtUtc?: string;
  };
};

let refreshPromise: Promise<string> | null = null;

function getCurrentReturnUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }

  const returnUrl = encodeURIComponent(getCurrentReturnUrl());
  window.location.replace(`/login?returnUrl=${returnUrl}`);
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    refreshPromise = axios
      .post<RefreshResponse>(
        `${API_V1_BASE_URL}/auth/refresh-token`,
        {
          accessToken,
          refreshToken: refreshToken || undefined,
        },
        { withCredentials: true },
      )
      .then(({ data }) => {
        const session = data.data;
        if (!session?.accessToken) {
          throw new Error("Missing refreshed access token");
        }

        saveAuthToken(session.accessToken, {
          refreshToken: session.refreshToken,
          refreshTokenExpiresAtUtc: session.refreshTokenExpiresAtUtc,
        });
        return session.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_V1_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug("[AXIOS] Auth header set with token");
  }

  const method = config.method?.toLowerCase();
  const hasBody = config.data !== undefined && config.data !== null;

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  if ((method === "get" || method === "head") && !hasBody) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const responseErrors = error.response?.data?.errors;
    const fieldError = Array.isArray(responseErrors)
      ? responseErrors.find(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "message" in item &&
            typeof item.message === "string",
        )?.message
      : undefined;
    const message =
      fieldError ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.response?.statusText ||
      error.message ||
      "Có lỗi xảy ra.";

    if (status === 401) {
      console.error("[AXIOS 401] Unauthorized", {
        url: error.config?.url,
        message,
        data: error.response?.data,
      });

      if (error.config?.skipAuthRedirect) {
        const normalizedError = new Error(message);
        Object.assign(normalizedError, {
          response: error.response,
          config: error.config,
        });

        return Promise.reject(normalizedError);
      }

      const originalRequest = error.config;
      if (getAccessToken() && originalRequest && !originalRequest._retryAfterRefresh) {
        originalRequest._retryAfterRefresh = true;

        try {
          const accessToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("[AUTH] Session refresh failed", refreshError);
        }
      }

      clearAuth();
      redirectToLogin();

      return Promise.reject(
        new Error(
          "Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.",
        ),
      );
    }

    if (status === 403) {
      console.error("[AXIOS 403] Forbidden", {
        url: error.config?.url,
        message,
        data: error.response?.data,
      });

      const forbiddenMessage =
        message && message !== "Forbidden"
          ? message
          : "Bạn không có quyền thực hiện thao tác này.";

      return Promise.reject(new Error(forbiddenMessage));
    }

    if (!error.response) {
      console.error("[AXIOS Network Error]", error.message, error.config?.url);
      return Promise.reject(
        new Error(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
        ),
      );
    }

    console.error(`[AXIOS ${status}] Request failed:`, {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullUrl: `${error.config?.baseURL || ""}${error.config?.url}`,
      status,
      message,
      response: error.response?.data,
      headers: error.config?.headers,
    });
    const normalizedError = new Error(message);
    Object.assign(normalizedError, {
      response: error.response,
      config: error.config,
    });

    return Promise.reject(normalizedError);
  },
);
