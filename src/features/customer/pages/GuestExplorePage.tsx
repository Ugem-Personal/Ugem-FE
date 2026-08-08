import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  ChevronRight,
  Compass,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Search,
  Sparkles,
  Star,
  Store,
  Utensils,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import logoUrl from "@/assets/ugem-logo.png";
import { ModeToggle } from "@/shared/components";
import { getCategories } from "@/shared/services/categoryService";
import type { Category } from "@/shared/types";
import { getCategoryDisplayName } from "@/shared/utils/category";
import { cleanAddress } from "@/shared/utils/address";
import {
  getMerchantDetail,
  getMerchantsByCategory,
  searchMerchants,
} from "../services/merchantService";
import type { Merchant, MerchantDetail } from "../types";

// Warm food & gem themed gradient palettes for missing photos
const RICH_FOOD_GRADIENTS = [
  "from-amber-600 via-orange-600 to-rose-700",
  "from-teal-600 via-emerald-600 to-cyan-700",
  "from-indigo-600 via-purple-600 to-blue-700",
  "from-rose-600 via-pink-600 to-amber-600",
  "from-cyan-600 via-blue-600 to-teal-700",
];

function MerchantVisual({ merchant, index }: { merchant: Merchant; index: number }) {
  const image =
    merchant.logoUrl?.trim() ||
    merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl?.trim();
  const [failedImage, setFailedImage] = useState(false);

  const initials = useMemo(() => {
    const parts = (merchant.name || "").trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "UG"
    );
  }, [merchant.name]);

  const gradientClass = RICH_FOOD_GRADIENTS[index % RICH_FOOD_GRADIENTS.length];

  return (
    <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900">
      {image && !failedImage ? (
        <img
          src={image}
          alt={merchant.name || "Quán ăn trên UGem"}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          onError={() => setFailedImage(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br ${gradientClass} p-4 text-white text-center`}
        >
          <div className="grid h-13 w-13 place-items-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-white/90">{initials}</span>
        </div>
      )}
      
      {/* Soft dark bottom gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
      
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-950/60 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur-md shadow-md">
        <Sparkles className="h-3 w-3 text-cyan-300 animate-pulse" />
        Hidden gem
      </span>
    </div>
  );
}

export default function GuestExplorePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((items) => active && setCategories(items.filter((item) => !item.parentId)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const request = selectedCategory
      ? getMerchantsByCategory({
          categoryId: selectedCategory,
          search: activeKeyword || undefined,
          pageIndex: 1,
          pageSize: 24,
        })
      : searchMerchants({ keyword: activeKeyword, pageIndex: 1, pageSize: 24 });

    request
      .then((items) => active && setMerchants(items))
      .catch(() => {
        if (active) {
          setMerchants([]);
          setError("Chưa tải được danh sách quán. Hãy kiểm tra kết nối dịch vụ backend.");
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [activeKeyword, selectedCategory, requestVersion]);

  const resultLabel = useMemo(() => {
    if (loading) return "Đang tìm những địa điểm phù hợp…";
    return `${merchants.length} địa điểm đang sẵn sàng khám phá`;
  }, [loading, merchants.length]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setActiveKeyword(keyword.trim());
    setRequestVersion((value) => value + 1);
  }

  function chooseCategory(categoryId: string) {
    if (categoryId === selectedCategory) return;
    setLoading(true);
    setError("");
    setSelectedCategory(categoryId);
  }

  async function openMerchant(merchant: Merchant) {
    setDetailLoading(true);
    setDetail({ ...merchant, foods: merchant.menu ?? [] });
    try {
      setDetail(await getMerchantDetail(merchant.id));
    } catch {
      // Keep public summary visible
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300 pb-20">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Floating Glass Header Bar */}
      <header className="sticky top-4 z-40 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-6 shadow-xl backdrop-blur-2xl transition-colors duration-300">
          <Link to="/explore" className="flex items-center gap-3" aria-label="UGem Guest Explore">
            <img src={logoUrl} alt="UGem" className="h-8 w-auto transition-transform hover:scale-105" />
          </Link>
          
          <div className="hidden items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 sm:flex">
            <Compass className="h-4 w-4 text-cyan-500 dark:text-cyan-400 animate-spin-slow" />
            Guest Explorer Mode
          </div>

          <nav className="flex items-center gap-3" aria-label="Tài khoản">
            <ModeToggle />
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="hidden h-10 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 active:scale-95 sm:inline-flex"
            >
              Tạo tài khoản <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-300 animate-pulse" /> Nền Tảng Khám Phá Ẩm Thực UGem
          </span>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl text-slate-950 dark:text-white">
            Tìm kiếm địa điểm ẩm thực <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-600 via-teal-500 to-amber-500 dark:from-cyan-400 dark:via-teal-300 dark:to-amber-300 bg-clip-text text-transparent">
              tự do không giới hạn.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Tra cứu vị trí, khoảng cách và thực đơn công khai của các địa điểm nổi tiếng ngay tức thì.
          </p>

          {/* Floating Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 mx-auto max-w-3xl flex flex-col sm:flex-row gap-3 p-2.5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl transition-colors duration-300">
            <label className="flex h-14 flex-1 items-center gap-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/80 px-5 transition focus-within:ring-2 focus-within:ring-cyan-500/40">
              <Search className="h-5 w-5 text-cyan-500 dark:text-cyan-400 shrink-0" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Nhập tên quán, món ăn hoặc vị trí..."
                className="h-full w-full bg-transparent text-sm font-bold text-slate-950 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {keyword && (
                <button type="button" onClick={() => setKeyword("")} className="text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <button
              type="submit"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 active:scale-95"
            >
              Tìm ngay <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Info Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 px-4 py-2 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
              <ShieldCheck className="h-4 w-4 text-cyan-500 dark:text-cyan-400" /> Không cần tài khoản
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 px-4 py-2 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
              <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Tra cứu thời gian thực
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 px-4 py-2 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
              <LockKeyhole className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> Vị trí bảo mật
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Categories Bar */}
        {categories.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none" aria-label="Danh mục quán">
            <button
              onClick={() => chooseCategory("")}
              className={`h-11 shrink-0 rounded-2xl px-6 text-xs font-black transition duration-200 ${
                !selectedCategory
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                  : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              Tất cả danh mục
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => chooseCategory(category.id)}
                className={`h-11 shrink-0 rounded-2xl px-6 text-xs font-black transition duration-200 ${
                  selectedCategory === category.id
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                    : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {getCategoryDisplayName(category.name)}
              </button>
            ))}
          </div>
        ) : null}

        {/* Results Header */}
        <div className="mb-6 mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">UGem Collection</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Địa điểm gợi ý</h2>
          </div>
          <p className="hidden text-xs font-mono font-bold text-slate-500 dark:text-slate-400 sm:block">{resultLabel}</p>
        </div>

        {/* Merchant Cards Grid */}
        {loading ? (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 p-8">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-cyan-500 dark:text-cyan-400" />
              <p className="mt-3 text-xs font-bold font-mono">Đang tải địa điểm...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-8 text-center font-bold text-amber-700 dark:text-amber-300 text-xs">
            {error}
          </div>
        ) : merchants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Utensils className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">Chưa tìm thấy địa điểm</h3>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Thử tìm bằng từ khóa khác hoặc chọn Tất cả danh mục.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {merchants.map((merchant, index) => (
              <button
                key={merchant.id}
                type="button"
                onClick={() => void openMerchant(merchant)}
                className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-left shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-cyan-500/10"
              >
                <MerchantVisual merchant={merchant} index={index} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-black tracking-tight text-slate-950 dark:text-white transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {merchant.name || "Quán trên UGem"}
                    </h3>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition duration-300 group-hover:translate-x-1 group-hover:text-cyan-500 dark:group-hover:text-cyan-400" />
                  </div>

                  {merchant.address ? (
                    <p className="mt-2 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500 dark:text-cyan-400" />
                      <span className="line-clamp-2">{cleanAddress(merchant.address)}</span>
                    </p>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between text-xs font-bold">
                    {typeof merchant.rating === "number" ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 dark:text-amber-400" />
                        {merchant.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">ĐỊA ĐIỂM MỚI</span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/10 px-3.5 py-1.5 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                      Xem Menu <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {detail ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 dark:bg-slate-950/80 p-4 backdrop-blur-xl transition-opacity"
          role="presentation"
          onMouseDown={() => setDetail(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-merchant-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 sm:p-8 text-slate-900 dark:text-slate-100 transition-colors duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" /> Thông tin công khai
                </span>
                <h2 id="guest-merchant-title" className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {detail.name || "Quán trên UGem"}
                </h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detail.address ? (
              <p className="mt-4 flex gap-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4 shrink-0 text-cyan-500 dark:text-cyan-400 mt-0.5" />
                {cleanAddress(detail.address)}
              </p>
            ) : null}

            {detail.description ? (
              <p className="mt-4 whitespace-pre-line text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
                {detail.description}
              </p>
            ) : null}

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-950 dark:text-white">Thực đơn công khai</h3>
                {detailLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-500 dark:text-cyan-400" /> : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(detail.foods ?? detail.menu ?? []).slice(0, 6).map((food) => (
                  <div key={food.id} className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-slate-950/60 p-4">
                    <p className="font-bold text-xs text-slate-950 dark:text-white">{food.name}</p>
                    <p className="mt-1 text-xs font-mono font-black text-cyan-600 dark:text-cyan-400">
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(food.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-cyan-900 via-slate-900 to-indigo-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between border border-cyan-500/20 shadow-xl">
              <div>
                <p className="text-sm font-black">Đặt món & Trải nghiệm đầy đủ?</p>
                <p className="mt-0.5 text-xs text-slate-300">Đăng nhập tài khoản UGem để bắt đầu ngay.</p>
              </div>
              <Link
                to={`/login?returnUrl=${encodeURIComponent(`/customer/merchants/${detail.id}`)}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 transition hover:bg-cyan-400 active:scale-95"
              >
                Đăng nhập <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
