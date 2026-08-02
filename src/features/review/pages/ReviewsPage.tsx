import { useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useReviews } from "../hooks";
import type { Review } from "../services";

function getReviewText(review: Review) {
  return review.content || "";
}

export default function ReviewsPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get("merchantId") ?? undefined;
  const { data: reviews = [], isLoading, isError, error } = useReviews(merchantId);

  return (
    <div className="min-h-screen bg-linear-to-br from-cyan-50 via-slate-50 to-amber-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Đánh giá</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp phản hồi từ khách hàng cho merchant đang chọn.
          </p>
        </div>

        {!merchantId ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Chọn merchant để xem đánh giá theo API /reviews/merchant.
          </p>
        ) : isLoading ? (
          <p>Đang tải...</p>
        ) : isError ? (
          <p className="text-red-600">
            Lỗi:{" "}
            {error instanceof Error
              ? error.message
              : "Không tải được danh sách"}
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review: Review, idx: number) => (
                <div
                  key={review.reviewId || idx}
                  className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-950/5 backdrop-blur transition hover:-translate-y-px hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {review.title || review.name || "Đánh giá"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {getReviewText(review)}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        {Array.from({ length: review.rating || 0 }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className="fill-amber-400 text-amber-400"
                            />
                          ),
                        )}
                        <span className="ml-2 text-sm text-slate-500">
                          ({review.rating || 0}/5)
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500">
                Chưa có đánh giá nào.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
