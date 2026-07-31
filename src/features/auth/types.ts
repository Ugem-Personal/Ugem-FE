export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  refreshTokenExpiresAtUtc?: string;
};

export type RegisterRole = "Customer" | "Merchant";

export type GoogleLoginRequest = {
  idToken: string;
};

export type GoogleLoginResponse = LoginResponse & {
  fullName?: string;
  role?: string;
  avatarUrl?: string | null;
  isNewUser?: boolean;
};

export type RegisterRequest = {
  email: string;
  password: string;
  phoneNumber: string;
  fullName: string;
  avatarUrl?: string;
  role: RegisterRole;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  token: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type UserRole = "Customer" | "Merchant" | "Staff" | "Admin" | string;

export type JwtPayload = {
  UserId?: string;
  Email?: string;
  Name?: string;
  Role?: UserRole;
  CustomerId?: string;
  MerchantId?: string;
  AvatarUrl?: string | null;
  exp?: number;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  traceId?: string | null;
  timestampUtc?: string;
};
