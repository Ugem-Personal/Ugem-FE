import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Star, MessageSquareQuote, Store, Sparkles, RefreshCw, ChevronDown, Loader2 } from "lucide-react";
import { useReviews } from "../hooks";
import type { Review } from "../services";
import { UserAccountMenu } from "@/shared/components/UserAccountMenu";
import { searchMerchants } from "@/features/customer/services/merchantService";
import { getMyMerchantDetail } from "@/features/merchantPortal/services";
import type { Merchant } from "@/features/customer/types";

function getReviewAuthorName(review: Review) {
  return (
    review.customerName ||
    review.name ||
    review.title ||
    "Thực khách ẩn danh"
  );
}

function getReviewAuthorAvatarUrl(review: Review) {
  return review.customerAvatarUrl || review.imageUrl || null;
}

function getInitials(name?: string) {
  if (!name) return "KH";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

export default function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const merchantId = searchParams.get("merchantId") ?? undefined;
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);

  const { data: reviews = [], isLoading, isError, error, refetch } = useReviews(merchantId);

  // Auto-detect merchant if user is merchant and no merchantId is in search params
  useEffect(() => {
    let active = true;

    async function init() {
      setLoadingMerchants(true);

      try {
        const merchantList = await searchMerchants({ pageSize: 100 });
        if (active) {
          setMerchants(merchantList);
        }

        if (!merchantId) {
          try {
            const myMerchant = await getMyMerchantDetail();
            if (myMerchant?.id && active) {
              setSearchParams({ merchantId: myMerchant.id }, { replace: true });
            }
          } catch {
            // Not a merchant or error, user will select from list
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách nhà hàng:", err);
      } finally {
        if (active) {
          setLoadingMerchants(false);
        }
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [merchantId, setSearchParams]);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

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

          <div className="flex items-center gap-3">
            {/* Merchant Selector Dropdown */}
            {merchants.length > 0 && (
              <div className="relative">
                <select
                  value={merchantId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSearchParams({ merchantId: val });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 pr-8 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
                >
                  <option value="">-- Chọn quán cần xem --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}

            <UserAccountMenu fallbackName="Khách" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {!merchantId ? (
          <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-8 text-center shadow-sm space-y-4">
            <Store className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-200">
                Vui lòng chọn quán ăn
              </h3>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
                Hãy chọn một nhà hàng từ danh sách dưới đây hoặc từ menu để xem tổng hợp các đánh giá thực tế.
              </p>
            </div>

            {loadingMerchants ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                Đang tải danh sách quán...
              </div>
            ) : merchants.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto pt-2">
                {merchants.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSearchParams({ merchantId: m.id })}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-left shadow-sm hover:border-amber-500 hover:shadow-md transition active:scale-98"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300 text-xs">
                      {m.logoUrl ? (
                        <img src={m.logoUrl} alt={m.name || "Quán"} className="h-full w-full object-cover" />
                      ) : (
                        (m.name || "Quán").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                        {m.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400">
                        ⭐ {m.rating || 0}/5 ({m.reviewCount || 0} đánh giá)
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Chưa có quán nào trên hệ thống.</p>
            )}
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
                    {selectedMerchant?.name ? `Tổng quan đánh giá: ${selectedMerchant.name}` : "Tổng quan đánh giá"}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {reviews.length} nhận xét được ghi nhận từ khách hàng
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
                    className="group rounded-2xl border border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-lg shadow-cyan-950/5 backdrop-blur-xl transition hover:border-cyan-200 dark:hover:border-cyan-900 hover:shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950 text-xs font-black text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {getReviewAuthorAvatarUrl(review) ? (
                            <img
                              src={getReviewAuthorAvatarUrl(review)!}
                              alt={getReviewAuthorName(review)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(getReviewAuthorName(review))
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">
                            {getReviewAuthorName(review)}
                          </p>
                          <time className="text-[11px] font-semibold text-slate-400">
                            {formatDate(review.createdAt)}
                          </time>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                        {Array.from({ length: review.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="ml-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                          {review.rating || 0}/5
                        </span>
                      </div>
                    </div>

                    {getReviewText(review) && (
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                        "{getReviewText(review)}"
                      </p>
                    )}

                    {review.details && review.details.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Đánh giá chi tiết từng món:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {review.details.map((detail, dIdx) => (
                            <span
                              key={detail.reviewDetailId || dIdx}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                            >
                              ⭐ {detail.rating}/5
                              {detail.content ? `: ${detail.content}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
