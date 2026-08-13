import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Utensils,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/features/auth";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId") ?? searchParams.get("OrderId");
  const checkInToken = searchParams.get("checkInToken");
  const success = searchParams.get("success") === "1";
  const queryString = searchParams.toString();
  const checkInReturnPath = queryString
    ? `/check-in?${queryString}`
    : "/check-in";

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const merchantName = null;

  useEffect(() => {
    let active = true;

    async function runCheckIn() {
      try {
        if (success) {
          if (!active) return;

          setMessage("Check-in đã được xác thực thành công.");
          setStatus("success");
          return;
        }

        // Order QR should open the bill confirmation flow first. Check-in is
        // created only after the order payment is completed.
        if (orderId && checkInToken) {
          if (!active) return;

          navigate(
            `/orders/confirm?orderId=${encodeURIComponent(orderId)}` +
              `&checkInToken=${encodeURIComponent(checkInToken)}`,
          );
          return;
        }

        throw new Error("Missing orderId");
      } catch (error) {
        console.error(error);

        if (!active) return;

        setMessage(
          getErrorMessage(error) ||
            "Không thể ghi nhận check-in. Vui lòng thử lại.",
        );
        setStatus("error");
      }
    }

    const user = getCurrentUser();
    if (!user || (user.Role !== "Customer" && user.Role !== "Reviewer")) {
      const returnUrl = encodeURIComponent(checkInReturnPath);
      navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
      return;
    }

    void runCheckIn();

    return () => {
      active = false;
    };
  }, [checkInReturnPath, checkInToken, navigate, orderId, success]);

  return (
    <main className="app-page relative flex items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent)]" />
      <div className="pointer-events-none absolute -right-24 top-24 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-24 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />

        <section className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 text-center shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-100 dark:ring-cyan-900">
          <Utensils className="h-6 w-6" />
        </div>

        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-100/80 dark:ring-emerald-900/40">
              <CheckCircle2 className="h-12 w-12 stroke-[2.4]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Check-in thành công
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300">
              {merchantName
                ? `Cảm ơn bạn đã ghé ${merchantName}. Lượt check-in của bạn đã được ghi nhận.`
                : "Cảm ơn bạn đã ghé quán. Lượt check-in của bạn đã được ghi nhận."}
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    orderId
                      ? `/customer/orders/${orderId}`
                      : "/customer/orders",
                    { replace: true },
                  )
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                Đánh giá quán ăn
              </button>
              <button
                type="button"
                onClick={() => navigate("/customer", { replace: true })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition hover:bg-accent"
              >
                Khám phá thêm
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-8 ring-rose-100/80 dark:ring-rose-900/40">
              <XCircle className="h-12 w-12 stroke-[2.4]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Check-in thất bại
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300">
              {message}
            </p>
            <button
              type="button"
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 dark:bg-cyan-600 px-5 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 hover:bg-cyan-800 dark:hover:bg-cyan-700"
              onClick={() => {
                const returnUrl = encodeURIComponent(checkInReturnPath);
                navigate(`/login?returnUrl=${returnUrl}`);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </button>
          </>
        )}

        {status === "idle" && (
          <>
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 ring-8 ring-cyan-100/80 dark:ring-cyan-900/40">
              <Loader2 className="h-11 w-11 animate-spin" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Đang ghi nhận check-in...
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600">
              Ugem đang cố gắng ghi nhận check-in của bạn. Vui lòng đợi trong
              giây lát.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
