import { useSearchParams } from "react-router-dom";
import { Star, MessageSquareQuote, Store, Sparkles, RefreshCw } from "lucide-react";
import { useReviews } from "../hooks";
import type { Review } from "../services";
import { UserAccountMenu } from "@/shared/components/UserAccountMenu";

function getReviewText(review: Review) {
  return review.content || "";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export default function ReviewsPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get("merchantId") ?? undefined;
  const { data: reviews = [], isLoading, isError, error, refetch } = useReviews(merchantId);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/20">
              <MessageSquareQuote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                Đánh giá quán
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Phản hồi & trải nghiệm từ khách hàng
              </p>
            </div>
          </div>

          <UserAccountMenu fallbackName="Khách" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!merchantId ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-6 text-center shadow-sm">
            <Store className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />
            <h3 className="mt-3 text-base font-bold text-amber-900 dark:text-amber-200">
              Vui lòng chọn quán
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
              Hãy chọn một merchant từ danh sách để xem tổng hợp các đánh giá thực tế.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Bar Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xl shadow-cyan-950/5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 px-5 py-3 border border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{averageRating}</span>
                  <div className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.round(Number(averageRating))
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Tổng quan đánh giá
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {reviews.length} nhận xét được ghi nhận
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Làm mới
              </button>
            </div>

            {/* Content List */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-6 text-center">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                  Lỗi: {error instanceof Error ? error.message : "Không tải được danh sách đánh giá."}
                </p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-4">
                {reviews.map((review: Review, idx: number) => (
                  <article
                    key={review.reviewId || idx}
                    className="group rounded-2xl border border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-lg shadow-cyan-950/5 backdrop-blur-xl transition hover:border-cyan-200 dark:hover:border-cyan-900 hover:shadow-xl"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-950 dark:text-white">
                            {review.title || review.name || "Đánh giá từ khách hàng"}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {review.rating || 0}/5
                          </span>
                        </div>

                        {getReviewText(review) && (
                          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {getReviewText(review)}
                          </p>
                        )}
                      </div>

                      <time className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        {formatDate(review.createdAt)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Chưa có đánh giá nào
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Quán này chưa nhận được đánh giá nào từ khách hàng.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
