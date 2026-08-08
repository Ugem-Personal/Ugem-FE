import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  HeartOff,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import {
  getWishlist,
  removeWishlist,
  type WishlistItem,
} from "../services/wishlistService";
import { notify } from "@/shared/lib/notify";
import { ModeToggle } from "@/shared/components";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
import {
  WishlistMerchantCard,
  WishlistMerchantCardSkeleton,
} from "../components/WishlistMerchantCard";

export default function WishlistPage() {
  const handleBack = useSafeBack("/customer");
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchWishlist = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getWishlist();
      setItems(data ?? []);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được danh sách yêu thích.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getWishlist()
      .then((data) => {
        if (active) {
          setItems(data ?? []);
        }
      })
      .catch((error) => {
        if (active) {
          console.error(error);
          notify.error("Không tải được danh sách yêu thích.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRemove(merchantId: string) {
    if (!merchantId) return;

    setRemovingId(merchantId);

    try {
      await removeWishlist(merchantId);
      notify.success("Đã xóa quán khỏi danh sách yêu thích.");
      setItems((prev) =>
        prev.filter(
          (item) => item.merchantId !== merchantId && item.id !== merchantId,
        ),
      );
    } catch (error) {
      console.error(error);
      notify.error("Xóa khỏi yêu thích thất bại.");
    } finally {
      setRemovingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) =>
      (item.name || "").toLowerCase().includes(keyword),
    );
  }, [items, searchKeyword]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Dynamic Glow Backdrops */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Top Navbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void fetchWishlist()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
            <ModeToggle />
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> Saved Merchants
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            Quán ăn yêu thích ({items.length})
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            Danh sách quán ăn bạn đã lưu để đặt món lại bất cứ lúc nào.
          </p>
        </div>

        {/* Search Input Bar */}
        {items.length > 0 && (
          <div className="mb-6 relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm tên quán trong danh sách yêu thích..."
              className="h-11 w-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 pl-10 pr-4 text-xs font-bold text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-cyan-500 shadow-2xs"
            />
          </div>
        )}

        {/* Wishlist Items List / Skeleton / Empty */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <WishlistMerchantCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map((merchant, index) => {
              const merchantId = merchant.merchantId || merchant.id || "";
              return (
                <WishlistMerchantCard
                  key={merchantId || index}
                  merchant={merchant}
                  onRemove={(id) => void handleRemove(id)}
                  isRemoving={removingId === merchantId}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 p-12 text-center shadow-2xs backdrop-blur-md">
            <HeartOff className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              {searchKeyword ? "Không tìm thấy quán phù hợp" : "Chưa có quán yêu thích nào"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchKeyword
                ? "Thử thay đổi từ khóa tìm kiếm của bạn."
                : "Khám phá các quán ăn hấp dẫn và thả tim để lưu lại vào đây."}
            </p>
            <Link
              to="/customer"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-6 py-3 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition"
            >
              <Store className="h-4 w-4" /> Khám phá quán ăn
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
