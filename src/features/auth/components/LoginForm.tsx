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
                className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <FormControl>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />

                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    disabled={loginMutation.isPending}
                    aria-invalid={Boolean(form.formState.errors.email)}
                    className="
                      h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70
                      pl-12 text-base font-semibold text-slate-950 dark:text-white
                      shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500
                      focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15
                    "
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
              <label
                htmlFor="login-password"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Mật khẩu
              </label>
              <FormControl>
                <PasswordInput
                  id="login-password"
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...field}
                />
              </FormControl>

              <FormMessage className="text-xs font-semibold text-rose-600 dark:text-rose-400" />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-1">
          <label
            htmlFor="remember-account"
            className="group flex cursor-pointer items-center gap-2 select-none"
          >
            <div
              className={`grid h-4 w-4 place-items-center rounded border transition-colors ${
                rememberAccount
                  ? "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500"
                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
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
              {rememberAccount && <Check className="h-3 w-3 stroke-[3]" />}
            </div>

            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              Ghi nhớ email
            </span>
          </label>
        </div>

        {loginMutation.isError && (
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
          disabled={loginMutation.isPending}
          aria-disabled={loginMutation.isPending}
          className="w-full font-black text-sm"
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
