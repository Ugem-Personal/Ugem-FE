import { Eye, Flame, Plus, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchantMenuItem } from "../types";
import { ImageWithFallback } from "@/shared/components";

type FoodCardProps = {
  food: MerchantMenuItem;
  cartQuantity?: number;
  isOfflineOrder?: boolean;
  onOpenModal: (food: MerchantMenuItem) => void;
  className?: string;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export function FoodCard({
  food,
  cartQuantity = 0,
  isOfflineOrder = false,
  onOpenModal,
  className,
}: FoodCardProps) {
  const hasDiscount = Boolean(
    food.originalPrice && Number(food.originalPrice) > Number(food.price),
  );
  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(food.originalPrice) - Number(food.price)) /
          Number(food.originalPrice)) *
          100,
      )
    : 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-cyan-400 dark:hover:border-cyan-500/50 backdrop-blur-md",
        cartQuantity > 0 && "ring-2 ring-cyan-500/50 border-cyan-500",
        food.isCombo &&
          "border-amber-300/70 dark:border-amber-500/30 hover:border-amber-400",
        className,
      )}
    >
      <div className="relative flex gap-4 sm:gap-5">
        {/* Food Image Container */}
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-inner">
          <ImageWithFallback
            src={food.imageUrl}
            alt={food.name}
            fallbackIcon={<Flame className="h-6 w-6 text-cyan-400" />}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {food.isCombo && (
            <span className="absolute top-1.5 left-1.5 rounded-lg bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
              COMBO
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            {/* Combo tag row */}
            {food.isCombo && (
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                {food.servingSize && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Users size={10} /> {food.servingSize}
                  </span>
                )}
                {hasDiscount && (
                  <span className="inline-flex items-center rounded-md bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                    -{discountPercent}%
                  </span>
                )}
              </div>
            )}

            <h3 className="line-clamp-1 text-base sm:text-lg font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {food.name}
            </h3>

            {food.description && (
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {food.description}
              </p>
            )}

            {/* Combo items preview */}
            {food.isCombo && food.comboItems && food.comboItems.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {food.comboItems.map((ci) => (
                  <span
                    key={ci.id || ci.foodId}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    <span className="font-bold text-amber-600">{ci.quantity}x</span>
                    <span className="truncate max-w-[90px]">{ci.food?.name ?? "Món"}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base sm:text-lg font-black tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                  {formatPrice(food.price)}
                </p>
                {hasDiscount && (
                  <p className="text-xs font-bold text-slate-400 line-through font-mono">
                    {formatPrice(Number(food.originalPrice))}
                  </p>
                )}
              </div>
              {cartQuantity > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md w-fit border border-emerald-200 dark:border-emerald-500/30">
                  <ShoppingCart className="h-3 w-3" />
                  {cartQuantity} trong đơn
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenModal(food)}
              aria-label={`Xem chi tiết ${food.name}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-cyan-500 px-4 py-2.5 text-xs font-black text-white dark:text-slate-950 shadow-md transition hover:bg-cyan-600 dark:hover:bg-cyan-400 active:scale-95"
            >
              {isOfflineOrder ? (
                <>
                  <Eye className="h-4 w-4" /> Chi tiết
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Thêm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
