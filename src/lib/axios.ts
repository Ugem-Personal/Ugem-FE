import axios from "axios";
import { API_V1_BASE_URL } from "./env";
import { clearAuth, getAccessToken } from "../features/auth/store";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
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
  (error) => {
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
      clearAuth();
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

      if (typeof globalThis !== "undefined" && "location" in globalThis) {
        globalThis.location.href = "/login";
      }

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
