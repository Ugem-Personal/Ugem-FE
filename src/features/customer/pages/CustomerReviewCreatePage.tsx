import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageSquareQuote,
  Star,
} from "lucide-react";
import {
  createVerifiedVisitReview,
  type Review,
} from "@/features/review/services";
import {
  getReviewerProfile,
  notifyCustomerContributionUpdated,
} from "../services/customerService";

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Không thể đăng đánh giá. Vui lòng thử lại.";
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined;
  }

  const response = error.response;
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    typeof response.status === "number"
  ) {
    return response.status;
  }

  return undefined;
}

export default function CustomerReviewCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkInId = searchParams.get("checkInId");

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const [currentGemPoints, setCurrentGemPoints] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkInId || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const review = await createVerifiedVisitReview({
        checkInId,
        rating,
        content: content.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });

      notifyCustomerContributionUpdated();

      // The current review response does not include reward data. Refresh the
      // authoritative Gem balance without inventing a client-side reward.
      try {
        const profile = await getReviewerProfile();
        setCurrentGemPoints(profile?.gemPoints ?? null);
      } catch (profileError) {
        console.error("Không thể làm mới Gem balance sau review", profileError);
      }

      setSubmittedReview(review);
    } catch (submitError) {
      console.error(submitError);
      const isDuplicate = getErrorStatus(submitError) === 409;
      setError(
        isDuplicate
          ? "Bạn đã đánh giá lần ghé quán này rồi."
          : getErrorMessage(submitError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goToMerchant() {
    const merchantId = submittedReview?.merchantId;
    navigate(merchantId ? `/customer/merchants/${merchantId}` : "/customer");
  }

  if (!checkInId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950">
        <section className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl dark:border-rose-500/30 dark:bg-slate-900">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h1 className="mt-4 text-2xl font-black">Thiếu thông tin lượt ghé</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Hãy bắt đầu viết đánh giá từ một Verified Check-in hợp lệ.
          </p>
          <button
            type="button"
            onClick={() => navigate("/customer")}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-black text-white hover:bg-cyan-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Về khám phá
          </button>
        </section>
      </main>
    );
  }

  if (submittedReview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950">
        <section className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl dark:border-emerald-500/30 dark:bg-slate-900">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/40">
            <CheckCircle2 className="h-11 w-11" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Đánh giá đã được đăng</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cảm ơn đóng góp của bạn cho cộng đồng UFind.
          </p>
          {currentGemPoints !== null && (
            <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">
              Gem Points hiện tại: {currentGemPoints.toLocaleString("vi-VN")}
            </p>
          )}
          <button
            type="button"
            onClick={goToMerchant}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-600 px-5 text-sm font-black text-white hover:bg-cyan-500"
          >
            Quay lại quán
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <section className="overflow-hidden rounded-3xl border border-cyan-200/80 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <MessageSquareQuote className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                  Verified Review
                </p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  Chia sẻ trải nghiệm
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-cyan-50">
              Đánh giá này được gắn trực tiếp với lượt ghé đã xác minh của bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="text-sm font-black">Bạn chấm quán bao nhiêu sao?</p>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rating">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} sao`}
                      onClick={() => setRating(value)}
                      className="rounded-lg p-1 transition hover:scale-110"
                    >
                      <Star
                        className={`h-9 w-9 ${
                          value <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {rating}/5 — mọi mức đánh giá đều được ghi nhận.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-black">Nhận xét</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={3000}
                rows={6}
                placeholder="Điều gì đáng nhớ trong lần ghé quán này?"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {content.length}/3000
              </span>
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-black">
                <ImagePlus className="h-4 w-4 text-cyan-600" />
                Ảnh trải nghiệm (tuỳ chọn)
              </span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Đang đăng..." : "Đăng đánh giá"}
            </button>

            <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              Check-in ID: <span className="font-mono">{checkInId}</span>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
