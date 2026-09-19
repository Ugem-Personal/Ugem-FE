import {
  ChevronRight,
  Flame,
  MapPin,
  Sparkles,
  Star,
  Clock,
  Tag,
  Gift,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Merchant } from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";
import { cleanAddress } from "@/shared/utils/address";
import { ImageWithFallback } from "@/shared/components";
import { WishlistButton } from "./WishlistButton";
import { incrementMerchantView } from "../services/merchantService";
import { getMerchantOpenStatus } from "@/shared/utils/openingHours";

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
  backTo?: string;
  compact?: boolean;
  isWishlisted?: boolean;
  onWishlistToggle?: (nextSaved: boolean) => void;
};

function formatDistance(distanceKm: number) {
  if (distanceKm < 0.001) return "Gần bạn";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

export default function MerchantCard({
  merchant,
  selected = false,
  orderMode = "offline",
  backTo,
  compact = false,
  isWishlisted = false,
  onWishlistToggle,
}: Props) {
  const name = merchant.name || "Quán trên UFind";
  const descriptionPreview = getMerchantDescriptionPreview(
    merchant.description,
  );
  const underratedScore = getDisplayUnderratedScore(merchant);
  const isHotUnderrated =
    underratedScore !== null && underratedScore.percent >= 80;
  const openStatus = getMerchantOpenStatus(merchant.openingHours);

  const image =
    merchant.logoUrl?.trim() ||
    merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl?.trim() ||
    "";

  const hasCombo = Boolean(
    merchant.menu?.some((food) => food.isCombo) ||
      merchant.featuredFoods?.some((f) => f.toLowerCase().includes("combo")),
  );

  const campaignId = merchant.isSponsored
    ? merchant.sponsoredCampaign?.id
    : undefined;
  const viewSource = merchant.isSponsored ? "Sponsored" : "Recommendation";
  const merchantUrl = `/customer/merchants/${merchant.id}?mode=${orderMode}${
    backTo ? `&backTo=${encodeURIComponent(backTo)}` : ""
  }${campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : ""}`;

  if (compact) {
    return (
      <Link
        to={merchantUrl}
        onClick={() => {
          incrementMerchantView(merchant.id, viewSource).catch(() => {});
        }}
        aria-label={`Xem chi tiết quán ${name}`}
        className={cn(
          "group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3 transition-all duration-300 ease-out backdrop-blur-md",
          selected
            ? "border-cyan-500 bg-cyan-50/90 dark:bg-cyan-950/40 ring-2 ring-cyan-500/40 shadow-md"
            : "border-slate-200/80 bg-white/95 dark:border-white/10 dark:bg-slate-900/90 hover:border-cyan-400 dark:hover:border-cyan-500/50 hover:shadow-lg",
        )}
      >
        <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-inner">
          <ImageWithFallback
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute right-1.5 top-1.5 z-10">
            <WishlistButton
              merchantId={merchant.id}
              initialSaved={isWishlisted}
              size="sm"
              onToggleSuccess={onWishlistToggle}
            />
          </div>
          {merchant.isSponsored && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-950 shadow-md">
              Được tài trợ
            </span>
          )}
          {!openStatus.isOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 p-1 text-center backdrop-blur-[0.5px]">
              <span className="rounded-md bg-rose-950/90 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
                Đóng cửa
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
          <div>
            <h3 className="line-clamp-1 text-sm font-black text-slate-950 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
              {name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              {typeof merchant.rating === "number" && (
                <span className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-3 w-3 fill-amber-400" />
                  {formatRating(merchant.rating)}
                </span>
              )}
              {typeof merchant.distance === "number" && (
                <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                  • {formatDistance(merchant.distance)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {hasCombo && (
              <span className="rounded-lg border border-amber-500/40 bg-amber-50/90 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                🍱 Có Combo
              </span>
            )}
            {isHotUnderrated && (
              <span className="rounded-lg border border-amber-500/30 bg-amber-50/90 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                💎 Gem
              </span>
            )}
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-[10px] font-bold",
                openStatus.isOpen
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
              )}
            >
              {openStatus.statusText}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={merchantUrl}
      onClick={() => {
        incrementMerchantView(merchant.id, viewSource).catch(() => {});
      }}
      aria-label={`Xem chi tiết quán ${name}`}
      className={cn(
        "group relative flex flex-col h-full overflow-hidden rounded-3xl border bg-white/95 text-slate-900 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-950/15 backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-100",
        !openStatus.isOpen && "opacity-90 hover:opacity-100",
        selected
          ? "border-cyan-500 ring-2 ring-cyan-500/40 shadow-cyan-950/15"
          : "border-slate-200/80 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/50",
      )}
    >
      {/* Accent left indicator line */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-500 via-cyan-400 to-blue-600 opacity-0 transition-opacity duration-300 z-20",
          selected ? "opacity-100" : "group-hover:opacity-100",
        )}
      />

      {/* Shimmer sweep effect on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent opacity-0 transition-transform duration-1000 group-hover:translate-x-full group-hover:opacity-100 pointer-events-none z-20" />

      {/* Top Banner Image Container */}
      <div className="relative h-48 sm:h-52 w-full shrink-0 overflow-hidden bg-slate-900">
        <ImageWithFallback
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Dark gradient overlay on bottom of image for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent pointer-events-none" />

        {/* Wishlist Floating Button */}
        <div className="absolute right-3 top-3 z-10">
          <WishlistButton
            merchantId={merchant.id}
            initialSaved={isWishlisted}
            size="sm"
            onToggleSuccess={onWishlistToggle}
          />
        </div>

        {/* Top-Left Status Pills */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          {selected && (
            <span className="rounded-lg bg-cyan-600/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              Đang chọn
            </span>
          )}

          {merchant.isSponsored && (
            <span className="rounded-lg border border-amber-300/60 bg-amber-500/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md backdrop-blur-md">
              Được tài trợ
            </span>
          )}

          {merchant.isFavorite && !selected && (
            <span className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              <Star className="h-3 w-3 fill-white text-white" />
              Yêu thích
            </span>
          )}

          {merchant.isBoosted && !selected && !merchant.isFavorite && (
            <span className="flex items-center gap-1 rounded-lg border border-fuchsia-300 bg-gradient-to-r from-fuchsia-600 to-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md animate-pulse">
              <Sparkles className="h-3 w-3 fill-white text-white" />
              Ưu đãi
            </span>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md",
              openStatus.isOpen
                ? "border-emerald-400/40 bg-slate-950/70 text-emerald-300"
                : "border-rose-400/40 bg-rose-950/80 text-rose-200",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                openStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400",
              )}
            />
            {openStatus.statusText}
          </span>
        </div>

        {/* Bottom-Left Highlights on Image */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          {hasCombo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/95 px-3 py-1 text-xs font-black text-slate-950 shadow-lg backdrop-blur-md">
              🍱 Có Combo ưu đãi
            </span>
          )}

          {isHotUnderrated && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-slate-950/80 px-3 py-1 text-xs font-black text-amber-300 shadow-lg backdrop-blur-md"
              title="Điểm tiềm năng nổi bật - Quán ăn chất lượng cao"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              💎 Hidden Gem
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Restaurant Title */}
          <h3 className="line-clamp-1 text-base sm:text-lg font-black tracking-tight text-slate-950 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
            {name}
          </h3>

          {/* Description or Type Subtitle */}
          {(merchant.restaurantType || merchant.mainDishType) ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Store className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="line-clamp-1">
                {[merchant.restaurantType, merchant.mainDishType]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          ) : descriptionPreview.summary ? (
            <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {descriptionPreview.summary}
            </p>
          ) : null}

          {/* Tags & Key Metrics */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {typeof merchant.rating === "number" && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs font-mono dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 dark:text-amber-400" />
                {formatRating(merchant.rating)}
                {typeof merchant.reviewCount === "number" && merchant.reviewCount > 0 && (
                  <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400/80">
                    ({merchant.reviewCount})
                  </span>
                )}
              </span>
            )}

            {typeof merchant.distance === "number" &&
              Number.isFinite(merchant.distance) && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-cyan-200/80 bg-cyan-50/90 px-2.5 py-1 text-xs font-mono font-bold text-cyan-800 shadow-2xs dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
                  <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  {formatDistance(merchant.distance)}
                </span>
              )}

            {merchant.priceRange && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-purple-200/80 bg-purple-50/90 px-2.5 py-1 text-xs font-bold text-purple-800 shadow-2xs font-mono dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300">
                <Tag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                {merchant.priceRange}
              </span>
            )}

            {typeof merchant.checkInCount === "number" && merchant.checkInCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50/90 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-2xs dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                title="Số lượt check-in thực tế của khách tại quán"
              >
                <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                {merchant.checkInCount} check-in
              </span>
            )}

            {merchant.hasActiveCampaign && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {merchant.isBoosted ? "Voucher UFind" : "Khuyến mãi"}
              </span>
            )}

            {typeof merchant.preferenceScore === "number" &&
              merchant.preferenceScore > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan-200/80 bg-cyan-50/90 px-2.5 py-1 text-xs font-extrabold text-cyan-800 shadow-2xs dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300"
                  title="Mức độ phù hợp với sở thích ăn uống đã lưu"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  Hợp gu {Math.round(merchant.preferenceScore)}%
                </span>
              )}
          </div>

          {/* Address Line */}
          {merchant.address && (
            <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
              <span className="line-clamp-1">{cleanAddress(merchant.address)}</span>
            </p>
          )}
        </div>

        {/* Footer Action */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            Ăn tại quán
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50/90 px-3.5 py-1.5 text-xs font-black text-cyan-700 shadow-2xs transition-all duration-300 group-hover:bg-cyan-500 group-hover:text-slate-950 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            Xem quán
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
