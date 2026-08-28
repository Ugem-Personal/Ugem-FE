import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  RotateCcw,
  Sparkles,
  Star,
  Store,
  Tag,
  Utensils,
  X,
  Gift,
} from "lucide-react";
import { Link } from "react-router-dom";

import logoUrl from "@/assets/ugem-logo.png";
import { ModeToggle } from "@/shared/components";
import {
  DEFAULT_DISCOVERY_OPTIONS,
  getDiscoveryOptions,
} from "@/shared/services/categoryService";
import type { Category, DiscoveryOptions } from "@/shared/types";
import { getCategoryDisplayName } from "@/shared/utils/category";
import { cleanAddress } from "@/shared/utils/address";
import {
  getMerchantDetail,
  getNearbyMerchants,
} from "../services/merchantService";
import type { Merchant, MerchantDetail } from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";
import {
  type GeocodeResult,
  reverseGeocode,
  searchGeocodeAddress,
} from "@/shared/services/vietmapService";

type Coords = { latitude: number; longitude: number };
type LocationMode = "current" | "custom";

const DEFAULT_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const DISTANCE_OPTIONS = [5, 10, 15, 30];
// Warm food & gem themed gradient palettes for missing photos
const RICH_FOOD_GRADIENTS = [
  "from-amber-600 via-orange-600 to-rose-700",
  "from-teal-600 via-emerald-600 to-cyan-700",
  "from-indigo-600 via-purple-600 to-blue-700",
  "from-rose-600 via-pink-600 to-amber-600",
  "from-cyan-600 via-blue-600 to-teal-700",
];

function formatDistance(distance: number) {
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} m`;
  if (distance < 10) return `${distance.toFixed(1)} km`;
  return `${Math.round(distance)} km`;
}

function MerchantVisual({ merchant, index }: { merchant: Merchant; index: number }) {
  const logoImage = merchant.logoUrl?.trim();
  const menuImage = merchant.menu
    ?.find((item) => item.imageUrl?.trim())
    ?.imageUrl?.trim();
  const image = logoImage || menuImage;
  const [failedImage, setFailedImage] = useState(false);
  const underratedScore = getDisplayUnderratedScore(merchant);
  const isHiddenGem =
    underratedScore !== null && underratedScore.percent >= 80;

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
          className={
            logoImage
              ? "h-full w-full object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              : "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          }
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
      
      {isHiddenGem ? (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-950/60 px-3 py-1 text-[11px] font-extrabold text-white shadow-md backdrop-blur-md">
          <Sparkles className="h-3 w-3 text-cyan-300" />
          Hidden gem
        </span>
      ) : null}
    </div>
  );
}

export default function GuestExplorePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discoveryOptions, setDiscoveryOptions] = useState<DiscoveryOptions>(
    DEFAULT_DISCOVERY_OPTIONS,
  );
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS);
  const [locationMode, setLocationMode] = useState<LocationMode>("custom");
  const [locationLabel, setLocationLabel] = useState("TP. Hồ Chí Minh");
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    GeocodeResult[]
  >([]);
  const [locationSuggesting, setLocationSuggesting] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [distanceKm, setDistanceKm] = useState(15);
  const [priceRange, setPriceRange] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getDiscoveryOptions()
      .then((options) => {
        if (!active) return;
        setDiscoveryOptions(options);
        setCategories(options.foodCategories.filter((item) => !item.parentId));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = locationInput.trim();
    if (!editingLocation || query.length < 2) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLocationSuggesting(true);
      void searchGeocodeAddress(query, {
        proximity: null,
        size: 6,
      })
        .then((results) => {
          if (active) setLocationSuggestions(results.slice(0, 6));
        })
        .catch(() => {
          if (active) setLocationSuggestions([]);
        })
        .finally(() => {
          if (active) setLocationSuggesting(false);
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [editingLocation, locationInput]);

  useEffect(() => {
    let active = true;

    const request = getNearbyMerchants({
      latitude: coords.latitude,
      longitude: coords.longitude,
      keyword: activeKeyword || undefined,
      categoryId: selectedCategory || undefined,
      priceRange: priceRange || undefined,
      restaurantType: restaurantFilter || undefined,
      radiusKm: distanceKm,
    });

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
  }, [
    activeKeyword,
    coords.latitude,
    coords.longitude,
    distanceKm,
    priceRange,
    requestVersion,
    restaurantFilter,
    selectedCategory,
  ]);

  useEffect(() => {
    if (!detail) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detail]);

  const resultLabel = useMemo(() => {
    if (loading) return "Đang tìm những địa điểm phù hợp…";
    return `${merchants.length} địa điểm đang sẵn sàng khám phá`;
  }, [loading, merchants.length]);

  const hasActiveFilters = Boolean(
    activeKeyword ||
      selectedCategory ||
      priceRange ||
      restaurantFilter ||
      distanceKm !== 15,
  );

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

  function resetDiscoveryFilters() {
    setLoading(true);
    setError("");
    setKeyword("");
    setActiveKeyword("");
    setSelectedCategory("");
    setDistanceKm(15);
    setPriceRange("");
    setRestaurantFilter("");
  }

  function applyLocation(
    nextCoords: Coords,
    nextLabel: string,
    nextMode: LocationMode = "custom",
  ) {
    setLoading(true);
    setError("");
    setLocationError("");
    setLocationSuggestions([]);
    setCoords(nextCoords);
    setLocationMode(nextMode);
    setLocationLabel(cleanAddress(nextLabel) || "Vị trí đã chọn");
    setEditingLocation(false);
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    setLocationBusy(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        void reverseGeocode(nextCoords.latitude, nextCoords.longitude)
          .then((result) =>
            applyLocation(
              nextCoords,
              result?.address || "Vị trí hiện tại",
              "current",
            ),
          )
          .catch(() => applyLocation(nextCoords, "Vị trí hiện tại", "current"))
          .finally(() => setLocationBusy(false));
      },
      () => {
        setLocationBusy(false);
        setLocationError(
          "Không lấy được vị trí. Hãy cấp quyền Location hoặc nhập địa điểm thủ công.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function applyManualLocation(event: FormEvent) {
    event.preventDefault();
    const query = locationInput.trim();
    if (!query) return;

    setLocationBusy(true);
    setLocationError("");
    try {
      const first =
        locationSuggestions[0] ??
        (
          await searchGeocodeAddress(query, {
            proximity: null,
            size: 5,
          })
        )[0];
      if (!first) {
        setLocationError("Không tìm thấy địa điểm này. Hãy nhập cụ thể hơn.");
        return;
      }

      applyLocation(
        { latitude: first.lat, longitude: first.lng },
        first.display || first.address || query,
      );
    } catch {
      setLocationError("Chưa thể tìm địa điểm. Vui lòng thử lại.");
    } finally {
      setLocationBusy(false);
    }
  }

  function chooseLocationSuggestion(suggestion: GeocodeResult) {
    setLocationInput(suggestion.display || suggestion.address);
    applyLocation(
      { latitude: suggestion.lat, longitude: suggestion.lng },
      suggestion.display || suggestion.address || suggestion.name,
    );
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 pb-20 font-sans text-slate-900 selection:bg-cyan-500 selection:text-white transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Sticky navigation surface keeps scrolled content from showing above it. */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/85 px-4 shadow-lg transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/85 sm:px-6">
          <Link to="/explore" className="flex items-center gap-3" aria-label="UGem Guest Explore">
            <img src={logoUrl} alt="UGem" className="h-8 w-auto transition-transform hover:scale-105" />
          </Link>
          
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
      <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-6xl">
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
                placeholder="Nhập tên quán hoặc món ăn..."
                aria-label="Tìm theo tên quán hoặc món ăn"
                className="h-full w-full bg-transparent text-base font-bold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
              />
              {keyword && (
                <button type="button" onClick={() => setKeyword("")} aria-label="Xóa từ khóa" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-950 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-white">
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

        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Guest discovery filters */}
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 lg:max-w-xl">
              <p className="text-[11px] font-mono font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Phạm vi tìm kiếm
              </p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-label="Chọn cách xác định khu vực tìm kiếm"
              >
                <button
                  type="button"
                  aria-pressed={locationMode === "current"}
                  disabled={locationBusy}
                  onClick={useCurrentLocation}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-wait disabled:opacity-50 ${
                    locationMode === "current"
                      ? "border-cyan-500 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-500/40 hover:bg-cyan-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {locationBusy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Vị trí hiện tại
                </button>
                <button
                  type="button"
                  aria-pressed={locationMode === "custom"}
                  aria-expanded={editingLocation}
                  onClick={() =>
                    setEditingLocation((value) =>
                      locationMode === "custom" ? !value : true,
                    )
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    locationMode === "custom"
                      ? "border-cyan-500 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-500/40 hover:bg-cyan-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Khu vực khác
                </button>
              </div>
              <div className="mt-3 flex min-w-0 items-start gap-2 text-sm font-black text-slate-950 dark:text-white">
                <MapPin className="h-4 w-4 shrink-0 text-cyan-500" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {locationMode === "current"
                      ? "Đang tìm gần bạn"
                      : "Đang tìm quanh điểm đã chọn"}
                  </span>
                  <span className="mt-0.5 block truncate" title={locationLabel}>
                    {locationLabel}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-3xl lg:justify-end">
              <label className="relative min-w-36 flex-1 lg:max-w-48">
                <span className="sr-only">Khoảng cách</span>
                <select
                  value={distanceKm}
                  onChange={(event) => {
                    setLoading(true);
                    setDistanceKm(Number(event.target.value));
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  {DISTANCE_OPTIONS.map((distance) => (
                    <option key={distance} value={distance}>
                      ≤ {distance} km
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative min-w-36 flex-1 lg:max-w-48">
                <span className="sr-only">Mức giá</span>
                <select
                  value={priceRange}
                  onChange={(event) => {
                    setLoading(true);
                    setPriceRange(event.target.value);
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Tất cả mức giá</option>
                  {discoveryOptions.priceRanges.map((price) => (
                    <option key={price} value={price}>
                      {price}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative min-w-44 flex-1 lg:max-w-56">
                <span className="sr-only">Loại hình quán</span>
                <select
                  value={restaurantFilter}
                  onChange={(event) => {
                    setLoading(true);
                    setRestaurantFilter(event.target.value);
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Tất cả loại hình quán</option>
                  {discoveryOptions.restaurantTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {editingLocation ? (
            <form
              onSubmit={applyManualLocation}
              className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-cyan-500 focus-within:ring-3 focus-within:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-800">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={locationInput}
                    onChange={(event) => {
                      setLocationInput(event.target.value);
                      setLocationSuggestions([]);
                      setLocationSuggesting(false);
                      setLocationError("");
                    }}
                    placeholder="Nhập phường, quận/huyện hoặc tỉnh/thành..."
                    aria-label="Nhập khu vực muốn tìm quán"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={locationSuggestions.length > 0}
                    aria-controls="guest-location-suggestions"
                    className="h-full w-full bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400 dark:text-white sm:text-sm"
                  />
                  {locationSuggesting ? (
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-cyan-500" />
                  ) : null}
                </label>

                {locationSuggestions.length > 0 ? (
                  <div
                    id="guest-location-suggestions"
                    role="listbox"
                    aria-label="Gợi ý địa điểm"
                    className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-800"
                  >
                    {locationSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.ref_id}-${suggestion.lat}-${suggestion.lng}`}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => chooseLocationSuggestion(suggestion)}
                        className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-cyan-50 focus-visible:bg-cyan-50 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
                        <span className="min-w-0">
                          <strong className="block truncate text-xs font-black text-slate-950 dark:text-white">
                            {suggestion.name || suggestion.display}
                          </strong>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            {cleanAddress(
                              suggestion.display || suggestion.address,
                            )}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={locationBusy || !locationInput.trim()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {locationBusy ? "Đang tìm..." : "Áp dụng"}
              </button>
            </form>
          ) : null}

          {locationError ? (
            <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
              {locationError}
            </p>
          ) : null}

        </div>

        {/* Categories Bar */}
        {categories.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none" aria-label="Danh mục quán">
            <button
              type="button"
              onClick={() => chooseCategory("")}
              aria-pressed={!selectedCategory}
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
                type="button"
                onClick={() => chooseCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
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
        <div className="mb-6 mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Địa điểm gợi ý</h2>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <p className="text-left text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 sm:text-right sm:text-xs" aria-live="polite">{resultLabel}</p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetDiscoveryFilters}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black text-cyan-700 transition hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
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
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Thử thay đổi vị trí hoặc xóa các bộ lọc đang chọn.</p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetDiscoveryFilters}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {merchants.map((merchant, index) => (
              <button
                key={merchant.id}
                type="button"
                onClick={() => void openMerchant(merchant)}
                className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 text-left shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/60"
              >
                <MerchantVisual merchant={merchant} index={index} />
                <div className="p-6">
                  <div className="flex items-start gap-3">
                    <h3 className="line-clamp-1 text-base font-black tracking-tight text-slate-950 dark:text-white transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {merchant.name || "Quán trên UGem"}
                    </h3>
                  </div>

                  {merchant.address ? (
                    <p className="mt-2 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500 dark:text-cyan-400" />
                      <span className="min-w-0 flex-1 wrap-break-word">{cleanAddress(merchant.address)}</span>
                    </p>
                  ) : null}

                  {merchant.restaurantType || merchant.mainDishType ? (
                    <p className="mt-3 flex items-start gap-2 text-[11px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">
                      <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span>
                        {[merchant.restaurantType, merchant.mainDishType]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {typeof merchant.distance === "number" &&
                    Number.isFinite(merchant.distance) ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                        <Navigation className="h-3.5 w-3.5" />
                        {locationMode === "current"
                          ? "Cách bạn "
                          : "Cách điểm đã chọn "}
                        {formatDistance(merchant.distance)}
                      </span>
                    ) : null}

                    {merchant.priceRange ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                        <Tag className="h-3.5 w-3.5" />
                        {merchant.priceRange}
                      </span>
                    ) : null}

                    {merchant.hasActiveCampaign ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <Gift className="h-3.5 w-3.5" />
                        Khuyến mãi
                      </span>
                    ) : null}
                  </div>

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
                to={`/login?returnUrl=${encodeURIComponent(
                  `/customer/merchants/${detail.id}?backTo=${encodeURIComponent("/customer")}`,
                )}`}
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
