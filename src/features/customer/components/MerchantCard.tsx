import { useMemo, useState } from "react";
import {
  ChevronRight,
  Flame,
  MapPin,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Merchant } from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";
import { cleanAddress } from "@/shared/utils/address";

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

function formatRating(value: number) {
  return value.toFixed(2);
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
};

function formatDistance(distanceKm: number) {
  if (distanceKm < 0.001) return "Ngay gần bạn";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

function getUnderratedTone(percent: number) {
  if (percent <= 0) {
    return "border-slate-200/60 bg-slate-50/80 text-slate-500 shadow-sm";
  }

  if (percent >= 80) {
    return "border-emerald-200/60 bg-emerald-50/80 text-emerald-700 shadow-emerald-500/10 shadow-sm ring-1 ring-emerald-500/5";
  }

  if (percent >= 50) {
    return "border-cyan-200/60 bg-cyan-50/80 text-cyan-700 shadow-cyan-500/10 shadow-sm ring-1 ring-cyan-500/5";
  }

  return "border-slate-200/60 bg-slate-50/80 text-slate-600 shadow-sm";
}

export default function MerchantCard({
  merchant,
  selected = false,
  orderMode = "online",
  compact = false,
}: Props) {
  const name = merchant.name || "Unnamed merchant";
  const descriptionPreview = getMerchantDescriptionPreview(
    merchant.description,
  );
  const underratedScore = getDisplayUnderratedScore(merchant);
  const isHotUnderrated =
    underratedScore !== null && underratedScore.percent >= 80;
  const image =
    merchant.logoUrl?.trim() ||
    merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl?.trim() ||
    "";
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const shouldShowImage = Boolean(image) && failedImage !== image;
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "UG"
    );
  }, [name]);

  return (
    <Link
      to={`/customer/merchants/${merchant.id}?mode=${orderMode}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-white text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-900/5",
        compact ? "p-2.5" : "p-3.5",
        selected
          ? "border-cyan-300 bg-linear-to-br from-cyan-50/90 to-white shadow-cyan-950/10 ring-2 ring-cyan-400/50"
          : "border-slate-200/70 hover:border-cyan-200",
      )}
    >
      {/* Subtle indicator line */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-cyan-400 to-blue-500 opacity-0 transition-opacity duration-300",
          selected ? "opacity-100" : "group-hover:opacity-100",
        )}
      />

      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent opacity-0 transition-transform duration-1000 group-hover:translate-x-full group-hover:opacity-100" />

      <div
        className={cn(
          "relative flex min-w-0 flex-col sm:flex-row sm:items-start",
          compact ? "gap-2.5" : "gap-4",
        )}
      >
        {/* Image Container with overflow hidden for zoom effect */}
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden rounded-lg bg-slate-50 shadow-inner",
            compact ? "h-24 sm:h-20 sm:w-24" : "h-32 sm:h-28 sm:w-32",
          )}
        >
          {shouldShowImage ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-linear-to-br from-cyan-50 to-blue-50 text-cyan-700">
              <Store className="h-8 w-8 opacity-70" />
              <span className="text-sm font-black tracking-tight">{initials}</span>
            </div>
          )}

          {/* Overlays */}
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-lg" />
          
          {selected && (
            <span className="absolute right-2 top-2 rounded-md bg-cyan-500/95 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
              Đang chọn
            </span>
          )}

          {isHotUnderrated && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md border border-orange-200/80 bg-orange-50/95 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700 shadow-sm backdrop-blur-sm">
              <Flame className="h-3 w-3 fill-orange-500 text-orange-500 animate-pulse" />
              Hot
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3
              className={cn(
                "line-clamp-1 font-black leading-snug text-slate-900 transition-colors group-hover:text-cyan-700",
                compact ? "text-sm md:text-base" : "text-base md:text-lg",
              )}
            >
              {name}
            </h3>

            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors group-hover:bg-cyan-50 group-hover:border-cyan-200 group-hover:text-cyan-700 sm:inline-flex">
              Chi tiết
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          {!compact && merchant.description && (
            <div className="mt-1.5">
              {descriptionPreview.summary && (
                <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
                  {descriptionPreview.summary}
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          <div
            className={cn(
              "flex flex-wrap text-xs font-bold",
              compact ? "mt-2 gap-1.5" : "mt-3.5 gap-2.5",
            )}
          >
            {typeof merchant.rating === "number" && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/60 bg-amber-50/80 px-2.5 py-1.5 text-amber-700 shadow-sm ring-1 ring-amber-500/5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                {formatRating(merchant.rating)}
              </span>
            )}

            {typeof merchant.distance === "number" &&
              Number.isFinite(merchant.distance) && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-200/60 bg-cyan-50/80 px-2.5 py-1.5 text-cyan-700 shadow-sm ring-1 ring-cyan-500/5">
                  {formatDistance(merchant.distance)}
                </span>
              )}

            {underratedScore !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5",
                  getUnderratedTone(underratedScore.percent),
                )}
                title="US = Underrated Score từ BE, càng cao càng đáng thử."
              >
                {isHotUnderrated ? (
                  <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                )}
                {`US ${underratedScore.score.toFixed(2)}`}
              </span>
            )}
          </div>

          {merchant.address && (
            <p
              className={cn(
                "flex min-w-0 items-center gap-2 font-semibold text-slate-500 transition-colors group-hover:text-slate-600",
                compact ? "mt-2 text-xs" : "mt-3.5 text-[13px]",
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
              <span className="line-clamp-1">{cleanAddress(merchant.address)}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

