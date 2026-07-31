import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

import HeroCarousel from "../components/HeroCarousel";
import { Logo } from "./Logo";
import { resetPasswordApi } from "../services";
import { getResetPasswordErrorMessage } from "../errorMessages";

const HERO_IMAGES = [
  "https://mia.vn/media/uploads/blog-du-lich/pho-ganh-ha-noi-01-1702697225.jpg",
  "https://static.vinwonders.com/production/bun-bo-hue-1.jpg",
  "https://bandembanhom.com/wp-content/uploads/2025/01/Com-Tam-3-Ghien-1.webp",
  "https://adormusic.s3.us-east-2.amazonaws.com/wp-content/uploads/2023/07/22045644/mi-quang-ba-mua-5-1024x1024.jpeg",
];

const resetPasswordSchema = z
  .object({
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    token: z.string().min(1, "Vui lòng nhập mã xác nhận"),
    newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

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

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      token: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
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

  async function handleConfirmCode() {
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
    } else if (!z.string().email().safeParse(email).success) {
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
    } else {
      form.clearErrors("token");
    }

    form.clearErrors(["newPassword", "confirmNewPassword"]);
    form.setValue("newPassword", "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    form.setValue("confirmNewPassword", "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });

    if (!valid) return;

    setCodeConfirmed(true);
  }

  return (
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] lg:grid-cols-[1.18fr_0.82fr]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <section className="relative hidden min-h-[52vh] p-3 lg:block lg:h-screen lg:p-4">
        <HeroCarousel images={HERO_IMAGES} />
        <div className="hidden">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200 backdrop-blur">
              Password reset
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">
              Tạo mật khẩu mới cho tài khoản của bạn
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Nhập mã xác nhận từ email và đặt lại mật khẩu an toàn hơn.
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl lg:p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />

            <div className="relative">
              <Logo />

              <div className="mt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure reset
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                  Đặt lại mật khẩu
                </h1>

                <p className="mt-3.5 text-sm font-medium leading-relaxed text-slate-500">
                  Nhập email, mã xác nhận từ email và mật khẩu mới.
                </p>
              </div>

              <Form {...form}>
                {codeConfirmed ? (
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-5 space-y-3"
                  >
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="group relative">
                              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-600" />
                              <Input
                                type="password"
                                placeholder="Mật khẩu mới"
                                autoComplete="new-password"
                                className="h-12 rounded-2xl border-white/60 bg-white/70 pl-12 text-base font-semibold text-slate-900 shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:bg-white/90 focus-visible:ring-4 focus-visible:ring-cyan-400/15"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-sm font-semibold text-rose-600" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="group relative">
                              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-600" />
                              <Input
                                type="password"
                                placeholder="Xác nhận mật khẩu mới"
                                autoComplete="new-password"
                                className="h-12 rounded-2xl border-white/60 bg-white/70 pl-12 text-base font-semibold text-slate-900 shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:bg-white/90 focus-visible:ring-4 focus-visible:ring-cyan-400/15"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-sm font-semibold text-rose-600" />
                        </FormItem>
                      )}
                    />

                    {apiError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
                        {apiError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-12 w-full rounded-2xl bg-linear-to-r from-cyan-600 to-blue-600 text-[15px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-70 disabled:scale-100"
                    >
                      {submitting && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      {submitting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                    </Button>
                  </form>
                ) : (
                  <div className="mt-5 space-y-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="group relative">
                              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-600" />
                              <Input
                                type="email"
                                placeholder="Email"
                                autoComplete="email"
                                className="h-12 rounded-2xl border-white/60 bg-white/70 pl-12 text-base font-semibold text-slate-900 shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:bg-white/90 focus-visible:ring-4 focus-visible:ring-cyan-400/15"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-sm font-semibold text-rose-600" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="group relative">
                              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-600" />
                              <Input
                                placeholder="Mã xác nhận từ email"
                                autoComplete="one-time-code"
                                className="h-12 rounded-2xl border-white/60 bg-white/70 pl-12 text-base font-semibold text-slate-900 shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:bg-white/90 focus-visible:ring-4 focus-visible:ring-cyan-400/15"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-sm font-semibold text-rose-600" />
                        </FormItem>
                      )}
                    />

                    {apiError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
                        {apiError}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={() => void handleConfirmCode()}
                      className="h-12 w-full rounded-2xl bg-linear-to-r from-cyan-600 to-blue-600 text-[15px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                    >
                      Xác nhận mã
                    </Button>
                  </div>
                )}
              </Form>

              <div className="mt-5 space-y-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-black text-cyan-700 transition hover:text-cyan-800"
                >
                  Quay lại đăng nhập
                  <ArrowRight className="h-3 w-3" />
                </Link>

                <p className="text-[11px] font-medium leading-5 text-slate-500">
                  Mã xác nhận có hiệu lực trong 10 phút.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
