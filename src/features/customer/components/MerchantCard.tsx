
import {
  ChevronRight,
  Flame,
  MapPin,
  Sparkles,
  Star,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Merchant } from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";
import { cleanAddress } from "@/shared/utils/address";
import { ImageWithFallback } from "@/shared/components";
import { WishlistButton } from "./WishlistButton";

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

function formatRating(value: number) {
  return value.toFixed(1);
}

function getMerchantDescriptionPreview(description?: string) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const isMetaLine = (line: string) =>
    DESCRIPTION_META_LABELS.some((label) =>
      line.toLowerCase().startsWith(`${label.toLowerCase()}:`),
    );

  const isUiMarkerLine = (line: string) =>
    line.toLowerCase().includes("thông tin ui bổ sung");

  const summary = lines
    .filter((line) => !isMetaLine(line) && !isUiMarkerLine(line))
    .join(" ")
    .trim();

  return { summary };
}

type Props = {
  merchant: Merchant;
  selected?: boolean;
  orderMode?: "online" | "offline";
  compact?: boolean;
  isWishlisted?: boolean;
  onWishlistToggle?: (nextSaved: boolean) => void;
};

function formatDistance(distanceKm: number) {
  if (distanceKm < 0.001) return "Ngay gần bạn";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

function getUnderratedTone(percent: number) {
  if (percent <= 0) {
    return "border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 text-slate-600 dark:text-slate-400";
  }

  if (percent >= 80) {
    return "border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20";
  }

  return "border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 text-slate-700 dark:text-slate-300";
}

export default function MerchantCard({
  merchant,
  selected = false,
  orderMode = "online",
  compact = false,
  isWishlisted = false,
  onWishlistToggle,
}: Props) {
  const name = merchant.name || "Quán trên UGem";
  const descriptionPreview = getMerchantDescriptionPreview(merchant.description);
  const underratedScore = getDisplayUnderratedScore(merchant);
  const isHotUnderrated =
    underratedScore !== null && underratedScore.percent >= 80;

  const image =
    merchant.logoUrl?.trim() ||
    merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl?.trim() ||
    "";

  return (
    <Link
      to={`/customer/merchants/${merchant.id}?mode=${orderMode}`}
      aria-label={`Xem chi tiết quán ${name}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl border bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-950/15 backdrop-blur-md",
        compact ? "p-3" : "p-4 sm:p-5",
        selected
          ? "border-cyan-500 bg-gradient-to-br from-cyan-50/90 via-white to-white dark:from-cyan-950/40 dark:via-slate-900 dark:to-slate-900 shadow-cyan-950/15 ring-2 ring-cyan-500/40"
          : "border-slate-200/80 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/50",
      )}
    >
      {/* Accent left indicator line */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-500 via-cyan-400 to-blue-600 opacity-0 transition-opacity duration-300",
          selected ? "opacity-100" : "group-hover:opacity-100",
        )}
      />

      {/* Shimmer sweep effect on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent opacity-0 transition-transform duration-1000 group-hover:translate-x-full group-hover:opacity-100 pointer-events-none" />

      <div
        className={cn(
          "relative flex min-w-0 flex-col sm:flex-row sm:items-start",
          compact ? "gap-3" : "gap-4 sm:gap-5",
        )}
      >
        {/* Image Container */}
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden rounded-2xl bg-slate-900 shadow-inner",
            compact ? "h-28 sm:h-24 sm:w-28" : "h-40 sm:h-36 sm:w-36",
          )}
        >
          <ImageWithFallback
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Wishlist Floating Button */}
          <div className="absolute right-2 top-2 z-10">
            <WishlistButton
              merchantId={merchant.id}
              initialSaved={isWishlisted}
              size="sm"
              onToggleSuccess={onWishlistToggle}
            />
          </div>

          {selected && (
            <span className="absolute left-2 top-2 rounded-lg bg-cyan-600/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              Đang chọn
            </span>
          )}

          {isHotUnderrated && !selected && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg border border-orange-200/80 bg-orange-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              <Flame className="h-3 w-3 fill-white text-white animate-pulse" />
              Hot
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch pt-1 sm:pt-0">
          <div>
            <div className="flex min-w-0 items-start justify-between gap-2">
              <h3
                className={cn(
                  "line-clamp-1 font-black leading-snug tracking-tight text-slate-950 dark:text-white transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
                  compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
                )}
              >
                {name}
              </h3>

              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-300 transition-all duration-300 group-hover:bg-cyan-500 group-hover:border-cyan-500 group-hover:text-slate-950 sm:inline-flex shadow-2xs">
                Xem quán
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>

            {!compact && descriptionPreview.summary && (
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
                {descriptionPreview.summary}
              </p>
            )}
          </div>

          <div>
            {/* Tags & Pills */}
            <div
              className={cn(
                "flex flex-wrap text-xs font-bold",
                compact ? "mt-2 gap-1.5" : "mt-3 gap-2",
              )}
            >
              {typeof merchant.rating === "number" && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200/80 dark:border-amber-500/20 bg-amber-50/90 dark:bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-300 shadow-2xs font-mono">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 dark:text-amber-400" />
                  {formatRating(merchant.rating)}
                </span>
              )}

              {typeof merchant.distance === "number" &&
                Number.isFinite(merchant.distance) && (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-cyan-200/80 dark:border-cyan-500/20 bg-cyan-50/90 dark:bg-cyan-500/10 px-2.5 py-1 text-cyan-800 dark:text-cyan-300 shadow-2xs font-mono">
                    <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    {formatDistance(merchant.distance)}
                  </span>
                )}

              {underratedScore !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-extrabold shadow-2xs",
                    getUnderratedTone(underratedScore.percent),
                  )}
                  title="Underrated Score - Điểm tiềm năng BE"
                >
                  {isHotUnderrated ? (
                    <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                  {`US ${underratedScore.score.toFixed(2)}`}
                </span>
              )}
            </div>

            {merchant.address && (
              <p
                className={cn(
                  "flex min-w-0 items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200",
                  compact ? "mt-2 text-xs" : "mt-2.5 text-xs sm:text-sm",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span className="line-clamp-1">{cleanAddress(merchant.address)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
