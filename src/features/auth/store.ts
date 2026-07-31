import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "./types";
import { API_V1_BASE_URL } from "../../lib/env";

const TOKEN_KEY = "ugem_access_token";
const REFRESH_TOKEN_KEY = "ugem_refresh_token";
const REFRESH_TOKEN_EXPIRES_KEY = "ugem_refresh_token_expires_at";
const USER_KEY = "ugem_user";

export function saveAuthToken(
  accessToken: string,
  session?: {
    refreshToken?: string;
    refreshTokenExpiresAtUtc?: string;
  },
) {
  const user = jwtDecode<JwtPayload>(accessToken);

  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  // The API stores refresh tokens in an HttpOnly cookie. Keep reading a
  // legacy browser token only long enough to migrate an existing session.
  if (!session?.refreshToken) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_EXPIRES_KEY);
  }

  // // Debug log
  // console.log("[AUTH] Saved JWT Payload:", {
  //   UserId: user.UserId,
  //   Email: user.Email,
  //   Name: user.Name,
  //   Role: user.Role,
  //   CustomerId: user.CustomerId,
  // });

  return user;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getCurrentUser(): JwtPayload | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function updateStoredUser(payload: Partial<JwtPayload>) {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const nextUser = {
    ...currentUser,
    ...payload,
  };

  localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  return nextUser;
}

export function clearAuth() {
  const legacyRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  void fetch(`${API_V1_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: legacyRefreshToken || undefined,
    }),
  }).catch(() => undefined);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_KEY);
  localStorage.removeItem(USER_KEY);
}
