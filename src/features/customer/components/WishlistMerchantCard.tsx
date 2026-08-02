import { Link } from "react-router-dom";
import { Star, Store, Trash2, ArrowRight } from "lucide-react";
import type { WishlistItem } from "../services/wishlistService";
import { ImageWithFallback } from "@/shared/components";

type WishlistMerchantCardProps = {
  merchant: WishlistItem;
  onRemove: (merchantId: string) => void;
  isRemoving?: boolean;
};

export function WishlistMerchantCard({
  merchant,
  onRemove,
  isRemoving = false,
}: WishlistMerchantCardProps) {
  const merchantId = merchant.merchantId || merchant.id || "";

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/30">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Merchant Logo */}
        <Link
          to={`/customer/merchants/${merchantId}`}
          className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-md ring-1 ring-slate-200/80 dark:ring-white/10 group-hover:scale-105 transition-transform duration-300"
        >
          <ImageWithFallback
            src={merchant.logoUrl}
            alt={merchant.name}
            fallbackIcon={<Store className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />}
            className="h-full w-full object-cover"
          />
        </Link>

        {/* Info Content */}
        <div className="flex-1 min-w-0 w-full flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <Link
              to={`/customer/merchants/${merchantId}`}
              className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors truncate"
            >
              {merchant.name}
            </Link>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {merchant.rating || 0}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
            Quán ăn đối tác chất lượng trên UGem Platform
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => onRemove(merchantId)}
              disabled={isRemoving}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition disabled:opacity-50"
              aria-label={`Xóa ${merchant.name} khỏi quán yêu thích`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa khỏi danh sách
            </button>

            <Link
              to={`/customer/merchants/${merchantId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-cyan-500 px-4 py-2 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition"
            >
              Xem quán <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WishlistMerchantCardSkeleton() {
  return (
    <div className="h-36 animate-pulse rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-5 shadow-sm" />
  );
}
