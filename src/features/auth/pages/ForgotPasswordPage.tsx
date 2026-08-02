import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { AuthLayout } from "../components/AuthLayout";
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

import { forgotPasswordSchema, type ForgotPasswordSchema } from "../schema";
import { getForgotPasswordErrorMessage } from "../errorMessages";
import { forgotPasswordApi } from "../services";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordSchema) {
    setApiError("");
    setSubmitting(true);

    try {
      const res = await forgotPasswordApi({
        email: values.email.trim(),
      });

      if (!res.success) {
        throw new Error(res.message || "Forgot password failed");
      }

      notify.success("Mã xác nhận đã được gửi về email của bạn.");
      navigate(
        `/reset-password?email=${encodeURIComponent(values.email.trim())}`,
        { replace: true },
      );
    } catch (error) {
      console.error(error);
      setApiError(getForgotPasswordErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Khôi phục tài khoản"
      title="Quên mật khẩu?"
      subtitle="Nhập địa chỉ email đã đăng ký để nhận mã xác nhận đặt lại mật khẩu an toàn."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="forgot-email" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email của bạn
                </label>
                <FormControl>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Email đã đăng ký"
                      autoComplete="email"
                      disabled={submitting}
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
                Đang gửi mã...
              </>
            ) : (
              "Gửi mã xác nhận"
            )}
          </Button>
        </form>
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
