import { Minus, Plus, X, Users, Sparkles, Check, Utensils } from "lucide-react";
import type { MerchantFoodTopping, MerchantMenuItem } from "../types";
import { ImageWithFallback } from "@/shared/components";
import { cn } from "@/lib/utils";

export const DEFAULT_SAMPLE_TOPPINGS: MerchantFoodTopping[] = [
  { id: "top-egg", name: "Trứng ốp la", price: 5000 },
  { id: "top-cha", name: "Chả hấp", price: 8000 },
  { id: "top-rice", name: "Cơm thêm", price: 5000 },
  { id: "top-soup", name: "Canh rong biển", price: 10000 },
];

export function getEffectiveFoodToppings(
  food?: MerchantMenuItem | null,
): MerchantFoodTopping[] {
  if (!food) return [];
  if (food.toppings && food.toppings.length > 0) {
    return food.toppings;
  }
  return DEFAULT_SAMPLE_TOPPINGS;
}

const QUICK_NOTE_PRESETS = [
  "Ít cơm",
  "Không hành",
  "Nước sốt riêng",
  "Ít cay",
  "Ăn tại bàn",
  "Mang về",
];

type FoodOptionModalProps = {
  food: MerchantMenuItem;
  quantity: number;
  notes: string;
  toppingIds?: string[];
  mode: "add" | "edit";
  onQuantityChange: (qty: number) => void;
  onNotesChange: (notes: string) => void;
  onToppingToggle?: (toppingId: string, checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export function FoodOptionModal({
  food,
  quantity,
  notes,
  toppingIds = [],
  mode,
  onQuantityChange,
  onNotesChange,
  onToppingToggle,
  onConfirm,
  onClose,
}: FoodOptionModalProps) {
  const availableToppings = getEffectiveFoodToppings(food);

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

  const selectedToppingsTotal = availableToppings
    .filter((t) => toppingIds.includes(t.id))
    .reduce((sum, t) => sum + (t.price || 0), 0);

  const unitTotal = food.price + selectedToppingsTotal;
  const totalPrice = unitTotal * quantity;

  function toggleQuickNote(preset: string) {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      onNotesChange(preset);
      return;
    }

    const currentParts = trimmedNotes
      .split(/,\s*|\s*\|\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

    const exists = currentParts.some(
      (p) => p.toLowerCase() === preset.toLowerCase(),
    );

    if (exists) {
      const nextParts = currentParts.filter(
        (p) => p.toLowerCase() !== preset.toLowerCase(),
      );
      onNotesChange(nextParts.join(", "));
    } else {
      onNotesChange([...currentParts, preset].join(", "));
    }
  }

  function isNotePresetActive(preset: string) {
    return notes.toLowerCase().includes(preset.toLowerCase());
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-option-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] sm:max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header with Food Image & Info */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 p-5 sm:p-6">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 shadow-xs">
              <ImageWithFallback
                src={food.imageUrl}
                alt={food.name}
                fallbackIcon={<Utensils className="h-6 w-6 text-cyan-500" />}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                {food.isCombo ? "Combo nhiều người" : "Tùy chọn món ăn"}
              </span>
              <h2
                id="food-option-modal-title"
                className="mt-0.5 text-lg sm:text-xl font-black text-slate-950 dark:text-white truncate"
              >
                {food.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-base sm:text-lg font-black tabular-nums text-cyan-600 dark:text-cyan-400 font-mono">
                  {formatPrice(food.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xs text-slate-400 line-through font-mono">
                      {formatPrice(Number(food.originalPrice))}
                    </span>
                    <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tùy chọn"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Combo banner */}
          {food.isCombo && (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Combo Tiết Kiệm
                </span>
                {food.servingSize && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/90 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Users size={12} /> {food.servingSize}
                  </span>
                )}
              </div>

              {food.comboItems && food.comboItems.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Thành phần set ăn gồm:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {food.comboItems.map((ci) => (
                      <span
                        key={ci.id || ci.foodId}
                        className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-amber-200/60 dark:border-amber-800/40 shadow-2xs"
                      >
                        <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                          {ci.quantity}x
                        </span>
                        <span>{ci.food?.name ?? "Món"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toppings Section */}
          {availableToppings.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Món ăn kèm & Topping
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chọn thêm topping ưa thích theo nhu cầu
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Tùy chọn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableToppings.map((topping) => {
                  const isSelected = toppingIds.includes(topping.id);
                  return (
                    <button
                      key={topping.id}
                      type="button"
                      onClick={() => onToppingToggle?.(topping.id, !isSelected)}
                      className={cn(
                        "flex items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 shadow-xs"
                          : "border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                            isSelected
                              ? "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800",
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-black truncate">
                          {topping.name}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs font-bold",
                          isSelected
                            ? "text-cyan-700 dark:text-cyan-300 font-black"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        +{formatPrice(topping.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="food-option-notes"
                className="text-sm font-black text-slate-900 dark:text-white"
              >
                Ghi chú cho quán
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Không bắt buộc
              </span>
            </div>

            {/* Quick Note Presets */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_NOTE_PRESETS.map((preset) => {
                const active = isNotePresetActive(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleQuickNote(preset)}
                    className={cn(
                      "rounded-xl px-2.5 py-1 text-xs font-bold transition-colors",
                      active
                        ? "border border-cyan-500 bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300"
                        : "border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-white/10",
                    )}
                  >
                    {active ? `✓ ${preset}` : `+ ${preset}`}
                  </button>
                );
              })}
            </div>

            <textarea
              id="food-option-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Ví dụ: Ít cơm, không hành, để nước sốt riêng..."
              className="w-full resize-none rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="shrink-0 border-t border-slate-100 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Stepper */}
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Giảm số lượng"
                className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="w-8 text-center text-sm font-black font-mono text-slate-950 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
                disabled={quantity >= 99}
                aria-label="Tăng số lượng"
                className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={onConfirm}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 active:scale-[0.98]"
            >
              <span>{mode === "edit" ? "Cập nhật món" : "Thêm vào đơn"}</span>
              <span className="font-mono text-slate-900/80">·</span>
              <span className="font-mono text-base font-black">
                {formatPrice(totalPrice)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodOptionModal;
