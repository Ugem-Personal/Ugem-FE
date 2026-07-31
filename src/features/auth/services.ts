import { api } from "../../lib/axios";
import type { ApiResponse } from "@/shared/types";
import type {
  ForgotPasswordRequest,
  GoogleLoginRequest,
  GoogleLoginResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "./types";

export async function loginApi(payload: LoginRequest) {
  const { data } = await api.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    {
      email: payload.email,
      password: payload.password,
    },
    {
      skipAuthRedirect: true,
    },
  );

  return data.data;
}

export async function googleLoginApi(payload: GoogleLoginRequest) {
  const { data } = await api.post<ApiResponse<GoogleLoginResponse>>(
    "/auth/google-login",
    {
      idToken: payload.idToken,
    },
  );

  return data.data;
}

export async function refreshTokenApi(payload: {
  accessToken: string;
  refreshToken?: string;
}) {
  const { data } = await api.post<ApiResponse<LoginResponse>>(
    "/auth/refresh-token",
    payload,
    {
      skipAuthRedirect: true,
    },
  );

  return data.data;
}

export async function registerApi(payload: RegisterRequest) {
  const { data } = await api.post<ApiResponse<string>>("/auth/register", {
    email: payload.email,
    password: payload.password,
    phoneNumber: payload.phoneNumber,
    fullName: payload.fullName,
    role: payload.role,
  });

  return data;
}

export async function forgotPasswordApi(payload: ForgotPasswordRequest) {
  const { data } = await api.post<ApiResponse<null>>("/auth/forgot-password", {
    email: payload.email,
  });

  return data;
}

export async function resetPasswordApi(payload: ResetPasswordRequest) {
  const { data } = await api.post<ApiResponse<null>>("/auth/reset-password", {
    email: payload.email,
    token: payload.token,
    newPassword: payload.newPassword,
    confirmNewPassword: payload.confirmNewPassword,
  });

  return data;
}
