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
      <div className="space-y-6">
        {GOOGLE_CLIENT_ID ? (
          <div>
            <div className="flex justify-center">
              <div ref={googleButtonRef} className="min-h-11 w-full max-w-[380px]" />
            </div>

            {googleLoading && (
              <p className="mt-2 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">
                Đang đăng nhập bằng Google...
              </p>
            )}

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-3 font-bold text-slate-500 dark:text-slate-400">
                  HOẶC EMAIL
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <LoginForm />

        <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 pt-5 text-xs">
          <Link
            to="/forgot-password"
            className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
          >
            Quên mật khẩu?
          </Link>

          <div className="text-slate-600 dark:text-slate-400">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-black text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
            >
              Đăng ký ngay
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {showGooglePurposeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-black text-foreground">Bạn muốn làm gì tiếp theo?</h3>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Chào mừng bạn đến với UGem! Hãy chọn mục đích sử dụng để chúng tôi đưa bạn đến đúng giao diện.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => handleGooglePurpose("/customer")}
                className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left font-bold transition hover:border-cyan-500 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Khám Phá & Đặt Món</p>
                  <p className="text-xs font-medium text-muted-foreground">Tìm kiếm các quán ăn chất lượng gần bạn</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGooglePurpose("/merchant/application/create")}
                className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left font-bold transition hover:border-cyan-500 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Đăng Ký Mở Quán Ăn</p>
                  <p className="text-xs font-medium text-muted-foreground">Đưa thương hiệu ẩm thực lên UGem</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
