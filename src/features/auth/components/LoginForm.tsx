import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  LockKeyhole,
  Mail,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-xs leading-5 text-cyan-900 shadow-sm">
          <div className="flex items-start gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>

            <div>
              <p className="font-black text-cyan-950">UGem Secure Login</p>
              <p className="mt-0.5 text-[11px] font-semibold text-cyan-800/80">
                Đăng nhập để tiếp tục vào hệ thống quản lý.
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-700" />

                  <Input
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    className="
                      h-10 rounded-2xl border-white/70 bg-white/85
                      pl-12 text-sm font-semibold text-slate-950
                      shadow-sm ring-1 ring-slate-950/5 transition-all
                      placeholder:text-slate-400
                      focus-visible:border-cyan-500
                      focus-visible:ring-4
                      focus-visible:ring-cyan-500/15
                    "
                    {...field}
                  />
                </div>
              </FormControl>

              <FormMessage className="text-xs font-semibold text-rose-600" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="group relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:text-cyan-700" />

                  <Input
                    type="password"
                    placeholder="Mật khẩu"
                    autoComplete="current-password"
                    className="
                      h-10 rounded-2xl border-white/70 bg-white/85
                      pl-12 text-sm font-semibold text-slate-950
                      shadow-sm ring-1 ring-slate-950/5 transition-all
                      placeholder:text-slate-400
                      focus-visible:border-cyan-500
                      focus-visible:ring-4
                      focus-visible:ring-cyan-500/15
                    "
                    {...field}
                  />
                </div>
              </FormControl>

              <FormMessage className="text-xs font-semibold text-rose-600" />
            </FormItem>
          )}
        />

        {loginMutation.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
            {apiError}
          </div>
        )}

        <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cyan-100/80 bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-950/5 transition hover:border-cyan-200 hover:bg-cyan-50/60">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 transition group-hover:bg-white">
              <UserRound className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-slate-700">
                Nhớ tài khoản
              </span>
              <span className="block truncate text-[10px] font-semibold text-slate-400">
                Lần sau tự điền email
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={rememberAccount}
            onChange={(event) => setRememberAccount(event.target.checked)}
            className="sr-only"
          />
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition ${
              rememberAccount
                ? "bg-cyan-700 shadow-md shadow-cyan-900/20"
                : "bg-slate-200"
            }`}
            aria-hidden="true"
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full bg-white text-cyan-700 shadow-sm transition ${
                rememberAccount ? "translate-x-5" : "translate-x-0"
              }`}
            >
              {rememberAccount ? <Check className="h-3 w-3" /> : null}
            </span>
          </span>
        </label>

        <Button
          type="submit"
          disabled={loginMutation.isPending}
          className="
            h-10 w-full rounded-2xl bg-cyan-700 text-sm font-black
            text-white shadow-lg shadow-cyan-900/20 transition-all
            hover:-translate-y-0.5 hover:bg-cyan-800
            hover:shadow-xl hover:shadow-cyan-900/25
            disabled:translate-y-0 disabled:opacity-70
          "
        >
          {loginMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}

          {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </Form>
  );
}
