import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Loader2,
  Mail,
  Phone,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";

import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { registerSchema, type RegisterSchema } from "../schema";
import { registerApi } from "../services";
import { getRegisterErrorMessage } from "../errorMessages";

export function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      role: "Customer",
    },
  });

  const passwordValue = useWatch({ control: form.control, name: "password" });
  const confirmPasswordValue = useWatch({
    control: form.control,
    name: "confirmPassword",
  });

  async function onSubmit(values: RegisterSchema) {
    setApiError("");
    setSubmitting(true);

    try {
      const res = await registerApi({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber.trim(),
        password: values.password,
        role: values.role,
      });

      if (!res.success) {
        throw new Error(res.message || "Register failed");
      }

      notify.success("Đăng ký thành công. Vui lòng đăng nhập.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error(error);
      const errMsg = getRegisterErrorMessage(error);
      setApiError(errMsg);
      notify.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Tạo tài khoản UGem"
      title="Tham gia UGem Platform"
      subtitle="Bắt đầu trải nghiệm khám phá quán ăn ngon địa phương hoặc mở rộng thương hiệu ẩm thực của bạn."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4" noValidate>
          {apiError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/60 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300"
            >
              {apiError}
            </div>
          )}

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-name" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block">
                  Họ và tên
                </label>
                <FormControl>
                  <div className="group relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-name"
                      placeholder="Nhập họ và tên"
                      autoComplete="name"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.fullName)}
                      className="h-12 sm:h-12.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-white/20 pl-11 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 focus-visible:bg-white dark:focus-visible:bg-slate-900"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-email" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block">
                  Email
                </label>
                <FormControl>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-email"
                      type="email"
                      inputMode="email"
                      placeholder="Nhập địa chỉ email"
                      autoComplete="email"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.email)}
                      className="h-12 sm:h-12.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-white/20 pl-11 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 focus-visible:bg-white dark:focus-visible:bg-slate-900"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-phone" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block">
                  Số điện thoại
                </label>
                <FormControl>
                  <div className="group relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="Nhập số điện thoại"
                      autoComplete="tel"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.phoneNumber)}
                      className="h-12 sm:h-12.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-white/20 pl-11 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 focus-visible:bg-white dark:focus-visible:bg-slate-900"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-password" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block">
                  Mật khẩu
                </label>
                <FormControl>
                  <PasswordInput
                    id="register-password"
                    placeholder="Nhập mật khẩu"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={Boolean(form.formState.errors.password)}
                    className="text-sm font-semibold"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-confirm-password" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block">
                  Xác nhận mật khẩu
                </label>
                <FormControl>
                  <PasswordInput
                    id="register-confirm-password"
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    className="text-sm font-semibold"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <PasswordRequirements
            password={passwordValue}
            confirmPassword={confirmPasswordValue}
            showConfirmRequirement
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <fieldset disabled={submitting}>
                  <legend className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Vai trò sử dụng
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`group cursor-pointer rounded-2xl border p-3.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-cyan-500 ${
                        field.value === "Customer"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/20 shadow-xs"
                          : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-cyan-400 dark:hover:border-cyan-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="Customer"
                        className="sr-only"
                        checked={field.value === "Customer"}
                        onChange={() => field.onChange("Customer")}
                      />
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-950 dark:text-white">Khách hàng</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Khám phá & Đặt món</p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`group cursor-pointer rounded-2xl border p-3.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-cyan-500 ${
                        field.value === "Merchant"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/20 shadow-xs"
                          : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-cyan-400 dark:hover:border-cyan-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="Merchant"
                        className="sr-only"
                        checked={field.value === "Merchant"}
                        onChange={() => field.onChange("Merchant")}
                      />
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-950 dark:text-white">Chủ quán</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Quản lý & Phát triển</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </fieldset>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={submitting}
            aria-disabled={submitting}
            className="w-full font-black text-sm h-12 sm:h-12.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              "Đăng ký tài khoản"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3.5 text-center text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-400">Đã có tài khoản? </span>
        <Link
          to="/login"
          className="font-black text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-1 py-0.5"
        >
          Đăng nhập
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </AuthLayout>
  );
}
