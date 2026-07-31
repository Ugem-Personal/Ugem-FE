import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../services";
import { saveAuthToken } from "../store";
import type { LoginRequest } from "../types";

export function getRouteByRole(role?: string) {
  if (role === "Merchant") return "/merchant";
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Staff") return "/staff/dashboard";
  if (role === "Reviewer") return "/customer";
  return "/customer";
}

export function useLogin() {
  const navigate = useNavigate();
  // If login page was opened with a returnUrl query param, prefer that.
  const params = new URLSearchParams(window.location.search);
  const rawReturnUrl = params.get("returnUrl");
  let returnUrl: string | null = null;
  if (rawReturnUrl) {
    try {
      returnUrl = decodeURIComponent(rawReturnUrl);
    } catch {
      returnUrl = rawReturnUrl;
    }
  }

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const data = await loginApi(payload);
      const token = data.accessToken;

      if (!token) {
        throw new Error("Missing access token");
      }

      const user = saveAuthToken(token, {
        refreshToken: data.refreshToken,
        refreshTokenExpiresAtUtc: data.refreshTokenExpiresAtUtc,
      });
      return { data, user };
    },

    onSuccess: ({ user }) => {
      if (returnUrl) {
        // try to navigate back to requested path
        try {
          navigate(returnUrl, { replace: true });
          return;
        } catch {
          // fallthrough to role-based route
        }
      }

      navigate(getRouteByRole(user.Role), {
        replace: true,
      });
    },
  });
}
