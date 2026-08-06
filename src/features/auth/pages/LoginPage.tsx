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

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 380,
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

    return () => {
      cancelled = true;
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
            <div className="flex justify-center">
              <div
                ref={googleButtonRef}
                className="min-h-12 w-full max-w-[460px] flex justify-center items-center overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-slate-300 transition-colors"
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
