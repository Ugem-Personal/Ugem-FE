import { useEffect, useRef, useState } from "react";
import { Compass, Store, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";
import { getRouteByRole } from "../hooks/useLogin";
import { googleLoginApi } from "../services";
import { saveAuthToken } from "../store";
import { getGoogleLoginErrorMessage } from "../errorMessages";

import { notify } from "@/shared/lib/notify";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.toString().trim() ?? "";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;

          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGooglePurposeDialog, setShowGooglePurposeDialog] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  function handleGooglePurpose(path: string) {
    setShowGooglePurposeDialog(false);
    navigate(path, { replace: true });
  }

  useEffect(() => {
    if (sessionStorage.getItem("ugem_logout_success") === "true") {
      sessionStorage.removeItem("ugem_logout_success");
      notify.success("Đã đăng xuất tài khoản thành công.");
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    function renderGoogleButton() {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return;
      }

      googleButtonRef.current.innerHTML = "";

      const params = new URLSearchParams(window.location.search);
      const rawReturnUrl = params.get("returnUrl");
      let returnUrl: string | null = null;
      if (rawReturnUrl) {
        try {
          returnUrl = decodeURIComponent(rawReturnUrl);
        } catch {
          returnUrl = rawReturnUrl;
        }
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,

        callback: async (response) => {
          if (!response.credential) {
            notify.error("Không nhận được Google ID token.");
            return;
          }

          setGoogleLoading(true);

          try {
            const data = await googleLoginApi({
              idToken: response.credential,
            });

            const token = data.accessToken;

            if (!token) {
              throw new Error("Không nhận được token từ server.");
            }

            const user = saveAuthToken(token, {
              refreshToken: data.refreshToken,
              refreshTokenExpiresAtUtc: data.refreshTokenExpiresAtUtc,
            });

            notify.success("Đăng nhập bằng Google thành công!");

            if (data.isNewUser && user.Role === "Customer") {
              setShowGooglePurposeDialog(true);
              return;
            }

            if (returnUrl) {
              navigate(returnUrl, { replace: true });
              return;
            }

            navigate(getRouteByRole(user.Role), {
              replace: true,
            });
          } catch (error) {
            notify.error(getGoogleLoginErrorMessage(error));
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      renderButtonAppearance();
    }

    function renderButtonAppearance() {
      const container = googleButtonRef.current;
      if (cancelled || !container || !window.google?.accounts?.id) return;
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        logo_alignment: "left",
        width: Math.min(400, Math.max(240, Math.floor(container.clientWidth || 380))),
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (existingScript) {
        existingScript.addEventListener("load", renderGoogleButton);
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleButton;
        document.body.appendChild(script);
      }
    }

    const themeObserver = new MutationObserver(renderButtonAppearance);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    let lastWidth = googleButtonRef.current?.clientWidth;
    const resizeObserver = new ResizeObserver(() => {
      const width = googleButtonRef.current?.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      renderButtonAppearance();
    });
    if (googleButtonRef.current) resizeObserver.observe(googleButtonRef.current);

    return () => {
      cancelled = true;
      themeObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [navigate]);

  return (
    <AuthLayout
      eyebrow="Đăng nhập an toàn"
      title="Chào mừng trở lại"
      subtitle="Tiếp tục hành trình khám phá và quản lý trải nghiệm của bạn trên UGem."
    >
      <div className="space-y-5">
        {GOOGLE_CLIENT_ID ? (
          <div>
            <div className="relative flex justify-center w-full max-w-[400px] mx-auto overflow-hidden rounded-2xl group shadow-xs">
              {/* Custom Designed Button */}
              <button
                type="button"
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/90 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>Đăng nhập với Google</span>
              </button>

              {/* Transparent Google GIS Click Interceptor */}
              <div
                ref={googleButtonRef}
                className="absolute inset-0 z-10 w-full h-full opacity-[0.001] cursor-pointer overflow-hidden flex items-center justify-center [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!scale-150 [&_iframe]:!cursor-pointer"
                title="Đăng nhập với Google"
              />
            </div>

            {googleLoading && (
              <p className="mt-2 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">
                Đang đăng nhập bằng Google...
              </p>
            )}

            <div className="relative mt-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/90 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white dark:bg-slate-900 px-3 font-extrabold text-slate-400 dark:text-slate-500">
                  HOẶC EMAIL
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <LoginForm />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs font-medium">
          <Link
            to="/forgot-password"
            className="font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-1 py-0.5"
          >
            Quên mật khẩu?
          </Link>

          <div className="text-slate-600 dark:text-slate-400 text-center sm:text-right">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-black text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-1 py-0.5"
            >
              Đăng ký ngay
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {showGooglePurposeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white p-6 sm:p-7 shadow-2xl dark:bg-slate-900">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Bạn muốn làm gì tiếp theo?</h3>
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Chào mừng bạn đến với UGem! Hãy chọn mục đích sử dụng để chúng tôi đưa bạn đến đúng giao diện.
            </p>

            <div className="mt-6 grid gap-3.5">
              <button
                type="button"
                onClick={() => handleGooglePurpose("/customer")}
                className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 text-left font-bold transition-all hover:border-cyan-500 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                  <Compass className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    Khám Phá & Đặt Món
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tìm kiếm các quán ăn chất lượng gần bạn
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGooglePurpose("/merchant/application/create")}
                className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 text-left font-bold transition-all hover:border-amber-500 hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Store className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Đăng Ký Mở Quán Ăn
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Đưa thương hiệu ẩm thực lên UGem
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
