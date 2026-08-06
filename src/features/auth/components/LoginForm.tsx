import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginSchema } from "../schema";
import { useLogin } from "../hooks/useLogin";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { PasswordInput } from "./PasswordInput";
import { getLoginErrorMessage } from "../errorMessages";

const REMEMBERED_EMAIL_KEY = "ugem_remembered_email";

export function LoginForm() {
  const loginMutation = useLogin();
  const rememberedEmail =
    typeof window !== "undefined"
      ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || ""
      : "";
  const [rememberAccount, setRememberAccount] = useState(Boolean(rememberedEmail));

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: "",
    },
  });

  function onSubmit(values: LoginSchema) {
    const email = values.email.trim();

    if (rememberAccount) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    loginMutation.mutate({
      email,
      password: values.password,
    });
  }

  const apiError = getLoginErrorMessage(loginMutation.error);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <label
                htmlFor="login-email"
                className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block"
              >
                Email
              </label>
              <FormControl>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />

                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    disabled={loginMutation.isPending}
                    aria-invalid={Boolean(form.formState.errors.email)}
                    className="
                      h-12 sm:h-12.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70
                      hover:border-slate-300 dark:hover:border-white/20 pl-11 text-sm font-semibold text-slate-950 dark:text-white
                      shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500
                      focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 focus-visible:bg-white dark:focus-visible:bg-slate-900
                    "
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
              <label
                htmlFor="login-password"
                className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 inline-block"
              >
                Mật khẩu
              </label>
              <FormControl>
                <PasswordInput
                  id="login-password"
                  placeholder="Mật khẩu của bạn"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  className="text-sm font-semibold"
                  {...field}
                />
              </FormControl>

              <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1" />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-1">
          <label
            htmlFor="remember-account"
            className="group flex cursor-pointer items-center gap-2.5 select-none"
          >
            <div
              className={`grid h-4.5 w-4.5 place-items-center rounded border transition-all ${
                rememberAccount
                  ? "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500 shadow-xs"
                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-cyan-500"
              }`}
            >
              <input
                id="remember-account"
                type="checkbox"
                checked={rememberAccount}
                disabled={loginMutation.isPending}
                onChange={(e) => setRememberAccount(e.target.checked)}
                className="sr-only"
              />
              {rememberAccount && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>

            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              Ghi nhớ email
            </span>
          </label>
        </div>

        {loginMutation.isError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/60 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300"
          >
            {apiError}
          </div>
        )}

        <Button
          type="submit"
          disabled={loginMutation.isPending}
          aria-disabled={loginMutation.isPending}
          className="w-full font-black text-sm h-12 sm:h-12.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none mt-2"
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            "Đăng nhập"
          )}
        </Button>
      </form>
    </Form>
  );
}
