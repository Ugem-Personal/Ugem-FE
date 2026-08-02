import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";

import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notify";

import { resetPasswordSchema, type ResetPasswordSchema } from "../schema";
import { resetPasswordApi } from "../services";
import { getResetPasswordErrorMessage } from "../errorMessages";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

  const initialEmail = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams],
  );

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      token: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const passwordValue = useWatch({ control: form.control, name: "newPassword" });
  const confirmPasswordValue = useWatch({
    control: form.control,
    name: "confirmNewPassword",
  });

  async function onSubmit(values: ResetPasswordSchema) {
    setApiError("");
    setSubmitting(true);

    try {
      const res = await resetPasswordApi({
        email: values.email.trim(),
        token: values.token.trim(),
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });

      if (!res.success) {
        throw new Error(res.message || "Reset password failed");
      }

      notify.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error(error);
      setApiError(getResetPasswordErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmCode() {
    setApiError("");

    const email = form.getValues("email").trim();
    const token = form.getValues("token").trim();
    let valid = true;

    if (!email) {
      form.setError("email", {
        type: "manual",
        message: "Vui lòng nhập email",
      });
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.setError("email", {
        type: "manual",
        message: "Email không hợp lệ",
      });
      valid = false;
    } else {
      form.clearErrors("email");
    }

    if (!token) {
      form.setError("token", {
        type: "manual",
        message: "Vui lòng nhập mã xác nhận",
      });
      valid = false;
    } else if (!/^\d{6}$/.test(token)) {
      form.setError("token", {
        type: "manual",
        message: "Mã xác nhận phải gồm 6 chữ số",
      });
      valid = false;
    } else {
      form.clearErrors("token");
    }

    if (!valid) return;

    setCodeConfirmed(true);
  }

  return (
    <AuthLayout
      eyebrow="Bảo mật tài khoản"
      title="Đặt lại mật khẩu"
      subtitle="Nhập email, mã xác nhận gồm 6 chữ số gửi tới hộp thư của bạn và tạo mật khẩu mới."
    >
      <Form {...form}>
        {codeConfirmed ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <label htmlFor="reset-new-password" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Mật khẩu mới
                  </label>
                  <FormControl>
                    <PasswordInput
                      id="reset-new-password"
                      placeholder="Mật khẩu mới (Tối thiểu 6 ký tự)"
                      autoComplete="new-password"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.newPassword)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <label htmlFor="reset-confirm-password" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Xác nhận mật khẩu mới
                  </label>
                  <FormControl>
                    <PasswordInput
                      id="reset-confirm-password"
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.confirmNewPassword)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
                </FormItem>
              )}
            />

            <PasswordRequirements
              password={passwordValue}
              confirmPassword={confirmPasswordValue}
              showConfirmRequirement
            />

            {apiError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-300"
              >
                {apiError}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={submitting}
              aria-disabled={submitting}
              className="w-full font-black text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                "Xác nhận đổi mật khẩu"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <FormControl>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Email của bạn"
                        autoComplete="email"
                        aria-invalid={Boolean(form.formState.errors.email)}
                        className="h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 pl-12 text-base font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <label htmlFor="reset-token" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Mã xác nhận (OTP 6 chữ số)
                  </label>
                  <FormControl>
                    <div className="group relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                      <Input
                        id="reset-token"
                        placeholder="Ví dụ: 123456"
                        autoComplete="one-time-code"
                        maxLength={6}
                        aria-invalid={Boolean(form.formState.errors.token)}
                        className="h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 pl-12 text-base font-semibold tracking-wider text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
                </FormItem>
              )}
            />

            {apiError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-300"
              >
                {apiError}
              </div>
            )}

            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={handleConfirmCode}
              className="w-full font-black text-sm"
            >
              Xác nhận mã & Tiếp tục
            </Button>
          </div>
        )}
      </Form>

      <div className="mt-5 border-t border-slate-200/80 dark:border-white/10 pt-5 text-center text-xs">
        <Link
          to="/login"
          className="font-black text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
        >
          Quay lại đăng nhập
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </AuthLayout>
  );
}
