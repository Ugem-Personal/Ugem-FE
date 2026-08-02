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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {apiError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300"
            >
              {apiError}
            </div>
          )}

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Họ và tên
                </label>
                <FormControl>
                  <div className="group relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-name"
                      placeholder="Họ và tên (Tối thiểu 2 ký tự)"
                      autoComplete="name"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.fullName)}
                      className="h-10.5 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 pl-10 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <FormControl>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Email của bạn"
                      autoComplete="email"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.email)}
                      className="h-10.5 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 pl-10 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15"
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
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-phone" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Số điện thoại
                </label>
                <FormControl>
                  <div className="group relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="Số điện thoại"
                      autoComplete="tel"
                      disabled={submitting}
                      aria-invalid={Boolean(form.formState.errors.phoneNumber)}
                      className="h-10.5 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 pl-10 text-sm font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15"
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <FormControl>
                  <PasswordInput
                    id="register-password"
                    placeholder="Mật khẩu (Tối thiểu 6 ký tự)"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={Boolean(form.formState.errors.password)}
                    className="h-10.5 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <label htmlFor="register-confirm-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Xác nhận mật khẩu
                </label>
                <FormControl>
                  <PasswordInput
                    id="register-confirm-password"
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    className="h-10.5 text-sm"
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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <fieldset disabled={submitting}>
                  <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Vai trò sử dụng
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label
                      className={`group cursor-pointer rounded-xl border p-2.5 transition-all duration-200 ${
                        field.value === "Customer"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-500/20"
                          : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-cyan-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value="Customer"
                        className="sr-only"
                        checked={field.value === "Customer"}
                        onChange={() => field.onChange("Customer")}
                      />
                      <div className="text-center">
                        <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 mb-1">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">Khách hàng</p>
                        <p className="text-[10px] font-medium text-slate-500">Khám phá & Đặt món</p>
                      </div>
                    </label>

                    <label
                      className={`group cursor-pointer rounded-xl border p-2.5 transition-all duration-200 ${
                        field.value === "Merchant"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-500/20"
                          : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-cyan-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value="Merchant"
                        className="sr-only"
                        checked={field.value === "Merchant"}
                        onChange={() => field.onChange("Merchant")}
                      />
                      <div className="text-center">
                        <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-1">
                          <Store className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">Merchant</p>
                        <p className="text-[10px] font-medium text-slate-500">Đăng ký bán hàng</p>
                      </div>
                    </label>
                  </div>
                </fieldset>
                <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={submitting}
            aria-disabled={submitting}
            className="w-full font-black text-sm h-11 mt-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              "Đăng ký tài khoản"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-3.5 border-t border-slate-200/80 dark:border-white/10 pt-3 text-center text-xs">
        <span className="text-slate-600 dark:text-slate-400">Đã có tài khoản? </span>
        <Link
          to="/login"
          className="font-black text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
        >
          Đăng nhập
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </AuthLayout>
  );
}
