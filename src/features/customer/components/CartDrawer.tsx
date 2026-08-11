import { Flame, Minus, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import type { MerchantFoodTopping, MerchantMenuItem } from "../types";
import { ImageWithFallback } from "@/shared/components";

export type CartItem = {
  food: MerchantMenuItem;
  quantity: number;
  notes?: string;
  toppings?: MerchantFoodTopping[];
};

type CartDrawerProps = {
  isOpen: boolean;
  cart: CartItem[];
  total: number;
  cartItemCount: number;
  ordering: boolean;
  onClose: () => void;
  onIncrement: (foodId: string) => void;
  onDecrement: (foodId: string) => void;
  onRemoveItem?: (foodId: string) => void;
  onEditItem?: (item: CartItem) => void;
  onClearCart: () => void;
  onCreateOrder: () => void;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export function CartDrawer({
  isOpen,
  cart,
  total,
  cartItemCount,
  ordering,
  onClose,
  onIncrement,
  onDecrement,
  onRemoveItem,
  onEditItem,
  onClearCart,
  onCreateOrder,
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-4 backdrop-blur-md sm:items-stretch sm:justify-end sm:p-0 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-2xl sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-3xl border-l border-slate-200/80 dark:border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 p-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Cart Summary
            </span>
            <h2 id="cart-drawer-title" className="text-xl font-black text-slate-950 dark:text-white">
              Chi tiết đơn hàng
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-bold">Giỏ hàng của bạn đang trống</p>
            </div>
          ) : (
            cart.map((item) => {
              const toppingTotal = (item.toppings ?? []).reduce(
                (sum, t) => sum + (t.price || 0),
                0,
              );
              const itemPrice = (item.food.price + toppingTotal) * item.quantity;

              return (
                <div
                  key={item.food.id}
                  className="flex gap-4 border-b border-slate-100 dark:border-white/5 pb-4"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <ImageWithFallback
                      src={item.food.imageUrl}
                      alt={item.food.name}
                      fallbackIcon={<Flame className="h-5 w-5 text-cyan-400" />}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-950 dark:text-white truncate">
                      {item.food.name}
                    </h4>
                    <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 mt-0.5 font-mono">
                      {formatPrice(itemPrice)}
                    </p>

                    {item.toppings && item.toppings.length > 0 && (
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        Topping: {item.toppings.map((t) => t.name).join(", ")}
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                        Ghi chú: {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onEditItem && (
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        title="Chỉnh sửa ghi chú & topping"
                        className="h-7 w-7 rounded-lg border border-slate-200 dark:border-white/10 grid place-items-center text-xs text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-600 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDecrement(item.food.id)}
                      aria-label="Giảm món"
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-white/10 grid place-items-center text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-black w-4 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(item.food.id)}
                      aria-label="Tăng món"
                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-white/10 grid place-items-center text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.food.id)}
                        title="Xóa món"
                        className="h-7 w-7 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 grid place-items-center text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200/80 dark:border-white/10 p-6 space-y-4 bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-sm font-black text-slate-950 dark:text-white">
              <span>Tổng thanh toán ({cartItemCount} món):</span>
              <span className="text-xl text-cyan-600 dark:text-cyan-400 font-mono">
                {formatPrice(total)}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClearCart}
                className="w-1/3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                Xóa giỏ
              </button>
              <button
                type="button"
                onClick={onCreateOrder}
                disabled={ordering || cart.length === 0}
                className="w-2/3 rounded-xl bg-slate-950 dark:bg-cyan-500 p-3 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition disabled:opacity-50"
              >
                {ordering ? "Đang xử lý..." : "Xác nhận đặt món"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartDrawer;
