import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { addWishlist, removeWishlist } from "../services/wishlistService";
import { notify } from "@/shared/lib/notify";
import { getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  merchantId: string;
  initialSaved?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "full";
  className?: string;
  onToggleSuccess?: (nextSaved: boolean) => void;
};

export function WishlistButton({
  merchantId,
  initialSaved = false,
  size = "md",
  variant = "icon",
  className,
  onToggleSuccess,
}: WishlistButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!merchantId || loading) return;

    const user = getCurrentUser();
    if (!user) {
      notify.error("Vui lòng đăng nhập để lưu quán yêu thích.");
      return;
    }

    setLoading(true);
    const nextSaved = !saved;

    try {
      if (nextSaved) {
        await addWishlist(merchantId);
        notify.success("Đã thêm quán vào yêu thích.");
      } else {
        await removeWishlist(merchantId);
        notify.success("Đã xóa quán khỏi yêu thích.");
      }
      setSaved(nextSaved);
      onToggleSuccess?.(nextSaved);
    } catch (error) {
      console.error(error);
      notify.error("Không thể thay đổi trạng thái yêu thích. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const buttonPadding = {
    sm: "p-1.5 text-xs gap-1",
    md: "px-3 py-2 text-xs gap-1.5",
    lg: "px-4 py-2.5 text-sm gap-2",
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl border font-black transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-2xs",
          saved
            ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60"
            : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-rose-300 dark:hover:border-rose-500/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20",
          buttonPadding[size],
          className,
        )}
        aria-label={saved ? "Xóa khỏi danh sách quán yêu thích" : "Thêm vào danh sách quán yêu thích"}
      >
        {loading ? (
          <Loader2 className={cn("animate-spin text-rose-500", iconSizes[size])} />
        ) : (
          <Heart
            className={cn(
              "transition-all duration-300",
              iconSizes[size],
              saved
                ? "fill-rose-500 text-rose-500 scale-110"
                : "text-slate-400 dark:text-slate-400 hover:text-rose-500",
            )}
          />
        )}
        <span>{saved ? "Đã yêu thích" : "Yêu thích"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "grid place-items-center rounded-full border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-9 w-9",
        size === "lg" && "h-11 w-11",
        className,
      )}
      aria-label={saved ? "Xóa khỏi danh sách quán yêu thích" : "Thêm vào danh sách quán yêu thích"}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin text-rose-500", iconSizes[size])} />
      ) : (
        <Heart
          className={cn(
            "transition-all duration-300",
            iconSizes[size],
            saved
              ? "fill-rose-500 text-rose-500 scale-110"
              : "text-slate-400 dark:text-slate-400 hover:text-rose-500",
          )}
        />
      )}
    </button>
  );
}

export default WishlistButton;
