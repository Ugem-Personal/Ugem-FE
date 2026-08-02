import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Họ và tên phải có ít nhất 2 ký tự")
      .max(100, "Họ và tên không được vượt quá 100 ký tự"),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email")
      .email("Email không hợp lệ"),
    phoneNumber: z.string().trim().min(1, "Vui lòng nhập số điện thoại"),
    password: z
      .string()
      .min(6, "Mật khẩu tối thiểu 6 ký tự")
      .max(100, "Mật khẩu không được vượt quá 100 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    role: z.enum(["Customer", "Merchant"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email")
      .email("Email không hợp lệ"),
    token: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mã xác nhận")
      .regex(/^\d{6}$/, "Mã xác nhận phải gồm 6 chữ số"),
    newPassword: z
      .string()
      .min(6, "Mật khẩu tối thiểu 6 ký tự")
      .max(100, "Mật khẩu không được vượt quá 100 ký tự"),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
