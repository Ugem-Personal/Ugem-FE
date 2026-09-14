import { Check, Minus, Plus, X, Users, Sparkles } from "lucide-react";
import type { MerchantMenuItem } from "../types";

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

const NOTE_PRESETS = ["Không hành", "Ít cay", "Không ớt", "Ít đường", "Ít mỡ"];

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export function FoodOptionModal({
  food,
  quantity,
  notes,
  mode,
  onQuantityChange,
  onNotesChange,
  onConfirm,
  onClose,
}: FoodOptionModalProps) {
  const noteParts = notes.split(",").map((part) => part.trim()).filter(Boolean);
  const isSelected = (preset: string) => noteParts.some((part) => part.toLocaleLowerCase("vi") === preset.toLocaleLowerCase("vi"));
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-option-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
              {food.isCombo ? "Combo nhiều người" : "Tùy chọn món ăn"}
            </span>
            <h2 id="food-option-modal-title" className="mt-1 text-xl font-semibold leading-snug text-slate-950 dark:text-white">
              {food.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-cyan-700 dark:text-cyan-400">{formatPrice(food.price)}</span>
              {hasDiscount && <><span className="text-sm text-slate-500 line-through">{formatPrice(Number(food.originalPrice))}</span><span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">-{discountPercent}%</span></>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tùy chọn"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 overflow-y-auto px-6 pb-6 space-y-5">
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
                        <span className="font-black text-amber-600 dark:text-amber-400 font-mono">{ci.quantity}x</span>
                        <span>{ci.food?.name ?? "Món"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <label htmlFor="food-option-notes" className="text-sm font-semibold">Ghi chú cho quán</label>
              <span className="text-xs text-slate-500 dark:text-slate-400">Không bắt buộc</span>
            </div>
            <textarea
              id="food-option-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Ví dụ: Không hành, để nước sốt riêng..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {NOTE_PRESETS.map((preset) => {
                const selected = isSelected(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onNotesChange(selected
                      ? noteParts.filter((part) => part.toLocaleLowerCase("vi") !== preset.toLocaleLowerCase("vi")).join(", ")
                      : [notes.trim(), preset].filter(Boolean).join(", "))}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${selected
                      ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-500/15 dark:text-cyan-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-200 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:border-white/10">
          <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Số lượng</div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1} aria-label="Giảm số lượng"
                className="grid h-11 w-11 place-items-center rounded-lg disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-cyan-500 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-black text-slate-950 dark:text-white font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
                disabled={quantity >= 99} aria-label="Tăng số lượng"
                className="grid h-11 w-11 place-items-center rounded-lg disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-cyan-500 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-14 min-w-40 flex-1 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
            >
              {mode === "edit" ? "Cập nhật món" : "Thêm vào giỏ"}
              <span aria-live="polite" className="ml-1.5 whitespace-nowrap tabular-nums">· {formatPrice(food.price * quantity)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodOptionModal;
