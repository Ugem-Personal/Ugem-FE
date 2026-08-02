import { Flame, Plus, ShoppingCart } from "lucide-react";
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
  const hasToppings = Boolean(food.toppings && food.toppings.length > 0);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-cyan-400 dark:hover:border-cyan-500/50 backdrop-blur-md",
        cartQuantity > 0 && "ring-2 ring-cyan-500/50 border-cyan-500",
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

          {hasToppings && (
            <span className="absolute left-2 top-2 rounded-lg bg-slate-950/80 dark:bg-slate-900/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 backdrop-blur-md border border-white/10 shadow-md">
              +{food.toppings?.length} Topping
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h3 className="line-clamp-1 text-base sm:text-lg font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {food.name}
            </h3>

            {food.description && (
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {food.description}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-base sm:text-lg font-black tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                {formatPrice(food.price)}
              </p>
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
              disabled={isOfflineOrder}
              aria-label={`Thêm ${food.name} vào đơn hàng`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-cyan-500 px-4 py-2.5 text-xs font-black text-white dark:text-slate-950 shadow-md transition hover:bg-cyan-600 dark:hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isOfflineOrder ? "Tại quán" : "Thêm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
