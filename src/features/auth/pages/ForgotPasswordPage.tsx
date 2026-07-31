import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { getForgotPasswordErrorMessage } from "../errorMessages";
import { forgotPasswordApi } from "../services";
import { Logo } from "./Logo";

const HERO_IMAGES = [
  "https://mia.vn/media/uploads/blog-du-lich/pho-ganh-ha-noi-01-1702697225.jpg",
  "https://static.vinwonders.com/production/bun-bo-hue-1.jpg",
  "https://bandembanhom.com/wp-content/uploads/2025/01/Com-Tam-3-Ghien-1.webp",
  "https://adormusic.s3.us-east-2.amazonaws.com/wp-content/uploads/2023/07/22045644/mi-quang-ba-mua-5-1024x1024.jpeg",
];

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
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
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] lg:grid-cols-[1.18fr_0.82fr]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <section className="relative hidden min-h-[52vh] p-3 lg:block lg:h-screen lg:p-4">
        <HeroCarousel images={HERO_IMAGES} />
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
                  Reset access
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                  Quên mật khẩu
                </h1>

                <p className="mt-3.5 text-sm font-medium leading-relaxed text-slate-500">
                  Nhập email đã đăng ký để nhận mã xác nhận đặt lại mật khẩu.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-5 space-y-3"
                >
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
                    {submitting ? "Đang gửi mã..." : "Gửi mã xác nhận"}
                  </Button>
                </form>
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
                  Nếu email hợp lệ, hệ thống sẽ gửi mã xác nhận đặt lại mật
                  khẩu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
