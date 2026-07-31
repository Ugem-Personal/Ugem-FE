import { useEffect, useRef, useState } from "react";
import { Compass, Store, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import HeroCarousel from "../components/HeroCarousel";
import { LoginForm } from "../components/LoginForm";
import { getRouteByRole } from "../hooks/useLogin";
import { googleLoginApi } from "../services";
import { saveAuthToken } from "../store";
import { Logo } from "./Logo";
import { getGoogleLoginErrorMessage } from "../errorMessages";

import { notify } from "@/shared/lib/notify";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.toString().trim() ?? "";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

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

const HERO_IMAGES = [
  "https://mia.vn/media/uploads/blog-du-lich/pho-ganh-ha-noi-01-1702697225.jpg",
  "https://static.vinwonders.com/production/bun-bo-hue-1.jpg",
  "https://bandembanhom.com/wp-content/uploads/2025/01/Com-Tam-3-Ghien-1.webp",
  "https://adormusic.s3.us-east-2.amazonaws.com/wp-content/uploads/2023/07/22045644/mi-quang-ba-mua-5-1024x1024.jpeg",
];

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
        width: 360,
      });
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      renderGoogleButton();

      existingScript.addEventListener("load", renderGoogleButton, {
        once: true,
      });

      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");

    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    script.onload = renderGoogleButton;

    script.onerror = () => notify.error("Không tải được Google Sign-In.");

    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="relative grid min-h-screen grid-cols-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] lg:grid-cols-[1.18fr_0.82fr]">
      {/* grid background */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />

      {/* glow */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      {/* left */}
      <section className="relative hidden min-h-[52vh] p-3 lg:block lg:h-screen lg:p-4">
        <HeroCarousel images={HERO_IMAGES} />

        {/* floating caption */}
      </section>

      {/* right */}
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-3">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
            {/* glow */}
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />

            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />

            <div className="relative">
              <Logo />

              <div className="mt-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700 shadow-sm ring-1 ring-cyan-500/10">
                  UGem Platform
                </div>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 leading-[1.12]">
                  Khám phá quán ăn đang bị{" "}
                  <span className="bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    FLOP
                  </span>
                </h1>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Những quán ngon địa phương chưa nhiều người biết đến. Tìm
                  hidden gems, mở merchant và quản lý hồ sơ trong một nền tảng
                  hiện đại.
                </p>
              </div>

              {/* google */}
              <div className="mt-4 space-y-2">
                {GOOGLE_CLIENT_ID ? (
                  <>
                    <div
                      className={`flex min-h-12 justify-center rounded-2xl border border-white/60 bg-white/70 px-3 py-2 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/90 hover:shadow-md ${
                        googleLoading ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      <div ref={googleButtonRef} />
                    </div>
                    <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-center text-[11px] font-bold leading-5 text-amber-800 shadow-sm">
                      Google chỉ dùng cho tài khoản Customer.
                    </p>
                    <p className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-3 py-1.5 text-center text-[11px] font-bold leading-5 text-cyan-900 shadow-sm">
                      Email và mật khẩu dùng cho Customer, Reviewer, Merchant,
                      Staff và Admin.
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/50 font-semibold text-slate-400 shadow-sm backdrop-blur"
                  >
                    Chưa cấu hình Google Client ID
                  </button>
                )}
              </div>

              {/* divider */}
              <div className="my-2.5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                Hoặc
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <LoginForm />

              {/* footer links */}
              <div className="mt-2.5 space-y-1 text-center">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 hover:underline"
                >
                  Quên mật khẩu?
                </Link>

                <div>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-1 text-xs font-black text-amber-700 transition hover:text-amber-800"
                  >
                    Chưa có tài khoản? Đăng ký
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] font-medium leading-4 text-slate-500">
            Bằng cách tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách
            quyền riêng tư của UGem.
          </p>
        </div>
      </section>

      {/* purpose dialog */}
      {showGooglePurposeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-md transition-all duration-300">
          <section
            aria-modal="true"
            role="dialog"
            className="relative w-full max-w-md overflow-hidden rounded-4xl border border-white/50 bg-white/70 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-2xl transition-transform duration-300 scale-100"
          >
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />

            <div className="absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Welcome to UGem
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Bạn muốn bắt đầu như thế nào?
              </h2>

              <p className="mt-3.5 text-sm font-medium leading-relaxed text-slate-500">
                Tài khoản Google mới đã được tạo dưới vai trò Customer. Bạn có
                thể khám phá món ngon hoặc mở quán trên UGem.
              </p>

              <div className="mt-8 grid gap-4">
                <button
                  type="button"
                  onClick={() => handleGooglePurpose("/customer")}
                  className="group flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/60 px-5 py-4 text-left shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-linear-to-br from-slate-100 to-slate-200 text-slate-700 shadow-sm">
                      <Compass size={20} />
                    </span>

                    <div>
                      <p className="font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                        Khám phá món ngon
                      </p>

                      <p className="text-[13px] font-medium text-slate-500">
                        Tìm hidden gems quanh bạn
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-600" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleGooglePurpose("/merchant/application/create")
                  }
                  className="group flex w-full items-center justify-between rounded-2xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-4 text-left text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-900/30"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 shadow-inner">
                      <Store size={20} />
                    </span>

                    <div>
                      <p className="font-black">Mở quán trên UGem</p>

                      <p className="text-[13px] font-medium text-cyan-100">
                        Gửi hồ sơ merchant để xét duyệt
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 transition-all duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
