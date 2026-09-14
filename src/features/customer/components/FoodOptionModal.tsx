import { Minus, Plus, X, Users, Sparkles } from "lucide-react";
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
  toppingIds: _toppingIds,
  mode,
  onQuantityChange,
  onNotesChange,
  onToppingToggle: _onToppingToggle,
  onConfirm,
  onClose,
}: FoodOptionModalProps) {
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-option-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-6 py-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              {food.isCombo ? "Combo nhiều người" : "Tùy chọn món ăn"}
            </span>
            <h2 id="food-option-modal-title" className="text-lg font-black text-slate-950 dark:text-white">
              {food.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tùy chọn"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
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

          {/* Price & Quantity */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-white/5">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {food.isCombo ? "Giá bán Combo" : "Đơn giá món"}
              </span>
              <div className="flex items-baseline gap-2">
                <p className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {formatPrice(food.price)}
                </p>
                {hasDiscount && (
                  <>
                    <p className="text-xs font-bold text-slate-400 line-through font-mono">
                      {formatPrice(Number(food.originalPrice))}
                    </p>
                    <span className="rounded-md bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                aria-label="Giảm số lượng"
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-black text-slate-950 dark:text-white font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
                aria-label="Tăng số lượng"
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Special Notes & Presets */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              Ghi chú đặc biệt
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {NOTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onNotesChange(
                      notes.toLowerCase().includes(preset.toLowerCase())
                        ? notes
                        : [notes.trim(), preset].filter(Boolean).join(", "),
                    )
                  }
                  className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:border-cyan-300 dark:hover:border-cyan-500/40 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Ví dụ: Bỏ ớt, ít đường..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-xl border border-slate-200 dark:border-white/10 p-3 text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-2/3 rounded-xl bg-slate-950 dark:bg-cyan-500 p-3 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition"
            >
              {mode === "edit" ? "Cập nhật món" : "Thêm vào đơn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodOptionModal;
