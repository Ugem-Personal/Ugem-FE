import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  Map,
  MapPin,
  Navigation,
  Search,
  RotateCcw,
  Sparkles,
  Star,
  Store,
  Tag,
  X,
  Heart,
  Compass,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ModeToggle } from "@/shared/components";
import ufindLogo from "@/assets/ufind-logo.png";
import {
  getDiscoveryOptions,
} from "@/shared/services/categoryService";
import type { DiscoveryOptions } from "@/shared/types";
import { cleanAddress } from "@/shared/utils/address";
import {
  getMerchantDetail,
  getNearbyMerchants,
  getSponsoredMerchants,
} from "../services/merchantService";
import type {
  Merchant,
  MerchantDetail,
  SponsoredMerchant,
} from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";
import "./GuestExplorePage.css";
import {
  type GeocodeResult,
  reverseGeocode,
  searchGeocodeAddress,
} from "@/shared/services/vietmapService";
import VietMapLocationPickerModal from "../components/VietMapLocationPickerModal";
import NearbyMerchantsMap from "../components/NearbyMerchantsMap";

type Coords = { latitude: number; longitude: number };
type LocationMode = "current" | "custom";

const DEFAULT_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

function isValidVietnamCoords({ latitude, longitude }: Coords) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 8 &&
    latitude <= 24 &&
    longitude >= 102 &&
    longitude <= 110
  );
}

const EMPTY_DISCOVERY_OPTIONS: DiscoveryOptions = {
  restaurantTypes: [],
  priceRanges: [],
  mainDishTypes: [],
  foodCategories: [],
};

const MASCOT_LOOP_CROSSFADE_SECONDS = 0.8;
const MASCOT_LOOP_CROSSFADE_MS = 480;

function GuestMascotVideo() {
  const videosRef = useRef<Array<HTMLVideoElement | null>>([null, null]);
  const activeIndexRef = useRef(0);
  const transitioningRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  function blendIntoNextGreeting(index: number, force = false) {
    if (index !== activeIndexRef.current || transitioningRef.current) return;

    const currentVideo = videosRef.current[index];
    const nextIndex = 1 - index;
    const nextVideo = videosRef.current[nextIndex];
    if (!currentVideo || !nextVideo || !Number.isFinite(currentVideo.duration)) {
      return;
    }

    const remaining = currentVideo.duration - currentVideo.currentTime;
    if (!force && remaining > MASCOT_LOOP_CROSSFADE_SECONDS) return;

    transitioningRef.current = true;
    setIncomingIndex(nextIndex);
    nextVideo.currentTime = 0;

    void nextVideo
      .play()
      .then(() => {
        window.requestAnimationFrame(() => setCrossfading(true));
        transitionTimerRef.current = window.setTimeout(() => {
          currentVideo.pause();
          currentVideo.currentTime = 0;
          activeIndexRef.current = nextIndex;
          setActiveIndex(nextIndex);
          setIncomingIndex(null);
          setCrossfading(false);
          transitioningRef.current = false;
        }, MASCOT_LOOP_CROSSFADE_MS);
      })
      .catch(() => {
        setIncomingIndex(null);
        setCrossfading(false);
        transitioningRef.current = false;
        currentVideo.loop = true;
      });
  }

  return (
    <div
      className="guest-mascot-video-wrap"
      role="img"
      aria-label="Gem, chú sóc trợ lý khám phá UGem"
    >
      {[0, 1].map((index) => {
        const classes = ["guest-mascot-video"];
        if (index === activeIndex) {
          classes.push("is-current");
          if (crossfading) classes.push("is-fading-out");
        }
        if (index === incomingIndex) {
          classes.push("is-incoming");
          if (crossfading) classes.push("is-fading-in");
        }

        return (
          <video
            key={index}
            ref={(element) => {
              videosRef.current[index] = element;
            }}
            className={classes.join(" ")}
            autoPlay={index === 0}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onTimeUpdate={() => blendIntoNextGreeting(index)}
            onEnded={() => blendIntoNextGreeting(index, true)}
          >
            <source src="/videos/ugem-greeting.mp4" type="video/mp4" />
          </video>
        );
      })}
    </div>
  );
}

function getCuisineLabel(value: string) {
  if (/cơm/i.test(value)) return "Cơm";
  if (/bún|phở|mì|hủ tiếu/i.test(value)) return "Bún, Phở";
  if (/bánh mì/i.test(value)) return "Bánh mì";
  if (/ăn vặt|tráng miệng/i.test(value)) return "Ăn vặt";
  if (/trà sữa|cà phê|đồ uống/i.test(value)) return "Đồ uống";
  if (/lẩu|nướng/i.test(value)) return "Lẩu, nướng";
  if (/món chay|thực dưỡng/i.test(value)) return "Món chay";
  if (/món việt/i.test(value)) return "Món Việt";
  if (/hàn|nhật|thái/i.test(value)) return "Hàn, Nhật";
  if (/món âu/i.test(value)) return "Món Âu";

  const label = value.replace(/\s*\([^)]*\)/g, "").trim();
  return label.length > 16 ? `${label.slice(0, 15).trimEnd()}…` : label;
}

function getCuisineEmoji(value: string) {
  if (/cơm/i.test(value)) return "🍛";
  if (/bún|phở|mì|hủ tiếu/i.test(value)) return "🍜";
  if (/bánh mì/i.test(value)) return "🥖";
  if (/ăn vặt|tráng miệng/i.test(value)) return "🍢";
  if (/trà sữa|cà phê|đồ uống/i.test(value)) return "☕";
  if (/lẩu|nướng/i.test(value)) return "🍲";
  if (/món chay|thực dưỡng/i.test(value)) return "🥗";
  if (/món việt/i.test(value)) return "🥢";
  if (/hàn|nhật|thái/i.test(value)) return "🍣";
  if (/món âu/i.test(value)) return "🍕";
  return "🍽️";
}

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

function MerchantVisual({
  merchant,
  index,
}: {
  merchant: Merchant;
  index: number;
}) {
  const logoImage = merchant.logoUrl?.trim();
  const menuImage = merchant.menu
    ?.find((item) => item.imageUrl?.trim())
    ?.imageUrl?.trim();
  const image = menuImage || logoImage;
  const [failedImage, setFailedImage] = useState(false);
  const underratedScore = getDisplayUnderratedScore(merchant);
  const isHiddenGem = underratedScore !== null && underratedScore.percent >= 80;

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
    <div className="guest-merchant-photo group/photo">
      {image && !failedImage ? (
        <img
          src={image}
          alt={merchant.name || "Quán ăn trên UFind"}
          className={`guest-merchant-image ${menuImage ? "is-cover" : "is-contain"}`}
          onError={() => setFailedImage(true)}
        />
      ) : (
        <div
          className={`guest-merchant-placeholder bg-linear-to-br ${gradientClass}`}
        >
          <div className="guest-placeholder-icon">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-white/90">
            {initials}
          </span>
        </div>
      )}

      <div className="guest-photo-shade" />

      {isHiddenGem ? (
        <span className="guest-photo-gem">
          <Sparkles className="h-3 w-3" />
          Hidden gem
        </span>
      ) : null}
    </div>
  );
}

export default function GuestExplorePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [sponsoredMerchants, setSponsoredMerchants] = useState<
    SponsoredMerchant[]
  >([]);
  const [sponsoredLoading, setSponsoredLoading] = useState(true);
  const [sponsoredError, setSponsoredError] = useState("");
  const [discoveryOptions, setDiscoveryOptions] = useState<DiscoveryOptions>(
    EMPTY_DISCOVERY_OPTIONS,
  );
  const [discoveryOptionsError, setDiscoveryOptionsError] = useState("");
  const [selectedCuisineTab, setSelectedCuisineTab] = useState("all");
  const [hiddenGemsOnly, setHiddenGemsOnly] = useState(false);
  const [selectedMainDishType, setSelectedMainDishType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS);
  const [locationMode, setLocationMode] = useState<LocationMode>("custom");
  const [locationLabel, setLocationLabel] = useState("TP. Hồ Chí Minh (mặc định)");
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    GeocodeResult[]
  >([]);
  const [locationSuggestionError, setLocationSuggestionError] = useState("");
  const [locationSuggesting, setLocationSuggesting] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews" | "combo">("distance");
  const [priceRange, setPriceRange] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDiscoveryOptions()
      .then((options) => {
        if (!active) return;
        setDiscoveryOptions(options);
        setDiscoveryOptionsError("");
      })
      .catch(() => {
        if (!active) return;
        setDiscoveryOptionsError(
          "Chưa tải được bộ lọc từ máy chủ. Bạn vẫn có thể tìm quán bằng ô tìm kiếm.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = locationInput.trim();
    if (!editingLocation || query.length < 2) {
      setLocationSuggestionError("");
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLocationSuggesting(true);
      setLocationSuggestionError("");
      void searchGeocodeAddress(query, {
        proximity: { lat: coords.latitude, lng: coords.longitude },
        size: 6,
      })
        .then((results) => {
          if (active) {
            setLocationSuggestions(results.slice(0, 6));
            setLocationSuggestionError("");
          }
        })
        .catch(() => {
          if (active) {
            setLocationSuggestions([]);
            setLocationSuggestionError(
              "Không tải được gợi ý địa chỉ. Kiểm tra cấu hình VietMap hoặc nhập địa chỉ đầy đủ rồi áp dụng.",
            );
          }
        })
        .finally(() => {
          if (active) setLocationSuggesting(false);
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [coords.latitude, coords.longitude, editingLocation, locationInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSponsoredLoading(true);
    setSponsoredError("");

    const query = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      keyword: activeKeyword || undefined,
      priceRange: priceRange || undefined,
      restaurantType: restaurantFilter || undefined,
      mainDishType: selectedMainDishType || undefined,
      radiusKm: 15,
    };

    Promise.allSettled([getNearbyMerchants(query), getSponsoredMerchants(query)])
      .then(([organicResult, sponsoredResult]) => {
        if (!active) return;

        if (organicResult.status === "fulfilled") {
          setMerchants(organicResult.value);
          setError("");
        } else {
          setMerchants([]);
          setError(
            "Chưa tải được danh sách quán. Hãy kiểm tra kết nối dịch vụ backend.",
          );
        }

        setSponsoredMerchants(
          sponsoredResult.status === "fulfilled" ? sponsoredResult.value : [],
        );
        if (sponsoredResult.status === "rejected") {
          setSponsoredError(
            "Chưa tải được địa điểm tài trợ từ máy chủ. Vui lòng thử lại sau.",
          );
          console.error("Sponsored discovery unavailable", sponsoredResult.reason);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setSponsoredLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    activeKeyword,
    coords.latitude,
    coords.longitude,
    priceRange,
    requestVersion,
    restaurantFilter,
    selectedMainDishType,
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

  const displayedMerchants = useMemo(() => {
    let list = merchants;
    if (hiddenGemsOnly) {
      list = list.filter((merchant) => {
        const score = getDisplayUnderratedScore(merchant);
        return score !== null && score.percent >= 80;
      });
    }
    if (selectedCuisineTab === "combo") {
      list = list.filter((m) => m.menu?.some((food) => food.isCombo));
    }

    return [...list].sort((a, b) => {
      if (sortBy === "distance") {
        const distA =
          typeof a.distance === "number" && Number.isFinite(a.distance)
            ? a.distance
            : Number.MAX_VALUE;
        const distB =
          typeof b.distance === "number" && Number.isFinite(b.distance)
            ? b.distance
            : Number.MAX_VALUE;
        return distA - distB;
      }
      if (sortBy === "rating") {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return ratingB - ratingA;
      }
      if (sortBy === "reviews") {
        const reviewsA = a.reviewCount ?? 0;
        const reviewsB = b.reviewCount ?? 0;
        return reviewsB - reviewsA;
      }
      if (sortBy === "combo") {
        const hasComboA = a.menu?.some((f) => f.isCombo) ? 1 : 0;
        const hasComboB = b.menu?.some((f) => f.isCombo) ? 1 : 0;
        return hasComboB - hasComboA;
      }
      return 0;
    });
  }, [hiddenGemsOnly, merchants, selectedCuisineTab, sortBy]);

  const hasActiveFilters = Boolean(
    hiddenGemsOnly ||
    activeKeyword ||
    selectedMainDishType ||
    selectedCuisineTab === "combo" ||
    priceRange ||
    restaurantFilter ||
    sortBy !== "distance",
  );
  const mainDishFilterOptions = useMemo(
    () =>
      [
        ...new globalThis.Map(
          (discoveryOptions.mainDishTypes ?? []).map((value) => [
            getCuisineLabel(value).toLocaleLowerCase(),
            value,
          ] as const),
        ).values(),
      ],
    [discoveryOptions.mainDishTypes],
  );

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setHiddenGemsOnly(false);
    setSelectedCuisineTab("all");
    setSelectedMainDishType("");
    setActiveKeyword(keyword.trim());
    setRequestVersion((value) => value + 1);
  }

  function chooseCuisineTab(mainDishType: string) {
    if (mainDishType === selectedMainDishType && !hiddenGemsOnly) return;
    setHiddenGemsOnly(false);
    setSelectedCuisineTab(mainDishType);
    setSelectedMainDishType(mainDishType);
  }

  function resetDiscoveryFilters() {
    setKeyword("");
    setActiveKeyword("");
    setHiddenGemsOnly(false);
    setSelectedCuisineTab("all");
    setSelectedMainDishType("");
    setSortBy("distance");
    setPriceRange("");
    setRestaurantFilter("");
    setRequestVersion((value) => value + 1);
  }

  function applyLocation(
    nextCoords: Coords,
    nextLabel: string,
    nextMode: LocationMode = "custom",
  ) {
    if (!isValidVietnamCoords(nextCoords)) {
      setLocationError("Vị trí phải nằm trong Việt Nam. Hãy chọn lại địa điểm.");
      return false;
    }

    setLocationError("");
    setLocationSuggestionError("");
    setLocationSuggestions([]);
    setCoords(nextCoords);
    setLocationMode(nextMode);
    setLocationLabel(cleanAddress(nextLabel) || "Vị trí đã chọn");
    setRequestVersion((value) => value + 1);
    setEditingLocation(false);
    return true;
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
    setLocationSuggestionError("");
    try {
      const candidates = locationSuggestions.length
        ? locationSuggestions
        : await searchGeocodeAddress(query, {
            proximity: { lat: coords.latitude, lng: coords.longitude },
            size: 5,
          });
      const validCandidates = candidates.filter((result) =>
        isValidVietnamCoords({ latitude: result.lat, longitude: result.lng }),
      );

      if (!validCandidates.length) {
        setLocationError("Không tìm thấy địa điểm này. Hãy nhập cụ thể hơn.");
        return;
      }

      if (validCandidates.length > 1) {
        setLocationSuggestions(validCandidates.slice(0, 6));
        setLocationSuggestionError("Có nhiều địa điểm phù hợp. Hãy chọn đúng khu vực trong danh sách gợi ý.");
        return;
      }

      const [first] = validCandidates;

      applyLocation(
        { latitude: first.lat, longitude: first.lng },
        first.display || first.address || query,
      );
    } catch {
      setLocationError(
        "Không thể tra cứu địa chỉ. Kiểm tra VietMap Service key hoặc chọn vị trí trên bản đồ.",
      );
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
      const detailResult = await getMerchantDetail(merchant.id);
      setDetail(
        merchant.isSponsored && merchant.sponsoredCampaign
          ? {
              ...detailResult,
              discoveryType: "Sponsored",
              isSponsored: true,
              sponsoredCampaign: merchant.sponsoredCampaign,
            }
          : detailResult,
      );
    } catch {
      // Keep public summary visible
    } finally {
      setDetailLoading(false);
    }
  }

  function renderSponsoredSection() {
    if (sponsoredLoading) {
      return (
        <section className="guest-sponsored-inner" aria-labelledby="guest-sponsored-heading">
          <div className="guest-sponsored-title-row">
            <div>
              <p className="guest-eyebrow guest-sponsored-eyebrow">Được tài trợ</p>
              <h2 id="guest-sponsored-heading">Địa điểm được yêu thích</h2>
            </div>
            <span className="guest-sponsored-all">Xem tất cả <ArrowRight size={15} /></span>
          </div>
          <div className="guest-sponsored-grid">
            <div className="guest-sponsored-skeleton" />
            <div className="guest-sponsored-skeleton" />
            <div className="guest-sponsored-skeleton" />
          </div>
        </section>
      );
    }

    if (sponsoredError) {
      return <p className="guest-sponsored-error" role="status">{sponsoredError}</p>;
    }

    if (sponsoredMerchants.length === 0) return null;

    return (
      <section className="guest-sponsored-inner" aria-labelledby="guest-sponsored-heading">
        <div className="guest-sponsored-title-row">
          <div>
            <p className="guest-eyebrow guest-sponsored-eyebrow">Được tài trợ</p>
            <h2 id="guest-sponsored-heading">Khám phá địa điểm nổi bật</h2>
          </div>
          <a className="guest-sponsored-all" href="#discover">Xem tất cả <ArrowRight size={15} /></a>
        </div>
        <div className="guest-sponsored-grid">
          {sponsoredMerchants.map((merchant, index) => (
            <button
              key={`guest-sponsored-${merchant.id}-${merchant.sponsoredCampaign.id}`}
              type="button"
              onClick={() => void openMerchant(merchant)}
              className="guest-sponsored-card"
            >
              <MerchantVisual merchant={merchant} index={index} />
              <div className="guest-sponsored-copy">
                <span className="guest-sponsored-badge">
                  <Sparkles size={11} /> Được tài trợ
                </span>
                <h3>
                  {merchant.name || "Chưa cập nhật tên quán"}
                </h3>
                <p>{merchant.restaurantType || merchant.mainDishType || "Chưa cập nhật"}{merchant.priceRange ? ` · ${merchant.priceRange}` : ""}</p>
                <span className="guest-sponsored-rating"><Star size={14} fill="currentColor" /> {merchant.rating?.toFixed(1) ?? "Chưa có đánh giá"}{typeof merchant.reviewCount === "number" ? <> <i /> {merchant.reviewCount} đánh giá</> : null}</span>
              </div>
              <span className="guest-sponsored-distance">{typeof merchant.distance === "number" ? formatDistance(merchant.distance) : ""}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="guest-page">
      <header className="guest-nav">
        <div className="guest-shell guest-nav-inner">
          <Link to="/explore" className="guest-brand" aria-label="UFind — Khám phá quán ăn"><img src={ufindLogo} alt="UFind" /></Link>
          <nav className="guest-primary-nav" aria-label="Điều hướng chính"><a href="#discover">Khám phá</a><a href="#nearby">Gần bạn</a><a href="#hidden-gems">Hidden Gems</a></nav>
          <div className="guest-account-nav"><ModeToggle /><Link to="/login" className="guest-login">Đăng nhập</Link><Link to="/register" className="guest-register">Đăng ký</Link></div>
        </div>
      </header>

      <section className="guest-hero">
        <div className="guest-shell guest-hero-grid">
          <div className="guest-hero-copy">
            <span className="guest-hero-badge"><Sparkles size={14} /> Khám phá quán ngon quanh bạn</span>
            <h1>Những quán ngon <span>không phải lúc nào</span> cũng nằm ở nơi đông người nhất.</h1>
            <p>Khám phá những địa điểm chất lượng nhưng chưa được nhiều người biết đến, dựa trên trải nghiệm thực tế từ cộng đồng UFind.</p>
            <form onSubmit={handleSearch} className="guest-search">
              <div className="guest-search-input">
                <Search size={19} aria-hidden="true" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm món ăn hoặc tên quán..." aria-label="Tìm món ăn hoặc tên quán" />
                {keyword ? <button type="button" onClick={() => setKeyword("")} aria-label="Xóa từ khóa"><X size={16} /></button> : null}
              </div>
              <button type="button" className="guest-search-location" onClick={() => setEditingLocation((value) => !value)} aria-expanded={editingLocation} title={locationMode === "current" ? "Đang dùng vị trí hiện tại — nhấn để thay đổi" : "Thay đổi khu vực tìm kiếm"}>
                <MapPin size={18} /><span>{locationLabel}</span><ChevronDown size={15} />
              </button>
              <button type="submit" className="guest-search-submit">Khám phá <ArrowRight size={17} /></button>
            </form>

            {editingLocation ? (
              <div className="guest-location-editor">
                <form onSubmit={applyManualLocation} className="guest-location-form">
                  <label>
                    <span className="sr-only">Khu vực muốn tìm</span>
                    <input value={locationInput} onChange={(event) => { setLocationInput(event.target.value); setLocationSuggestions([]); setLocationSuggesting(false); setLocationError(""); setLocationSuggestionError(""); }} placeholder="Nhập phường, quận hoặc thành phố..." autoComplete="off" aria-autocomplete="list" aria-expanded={locationSuggestions.length > 0} aria-controls="guest-location-suggestions" aria-invalid={Boolean(locationError || locationSuggestionError)} />
                    {locationSuggesting ? <LoaderCircle className="animate-spin" size={17} /> : null}
                  </label>
                  <button type="submit" disabled={locationBusy || !locationInput.trim()}>{locationBusy ? "Đang tìm..." : "Áp dụng"}</button>
                </form>
                {locationSuggestions.length ? (
                  <div id="guest-location-suggestions" className="guest-location-suggestions" role="listbox" aria-label="Gợi ý địa điểm">
                    {locationSuggestions.map((suggestion) => (
                      <button key={suggestion.ref_id + "-" + suggestion.lat + "-" + suggestion.lng} type="button" role="option" aria-selected="false" onClick={() => chooseLocationSuggestion(suggestion)}>
                        <MapPin size={16} /><span><strong>{suggestion.name || suggestion.display}</strong><small>{cleanAddress(suggestion.display || suggestion.address)}</small></span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {locationSuggestionError ? <p className="guest-location-error" role="alert">{locationSuggestionError}</p> : null}
                <div className="guest-location-actions">
                  <button type="button" onClick={useCurrentLocation} disabled={locationBusy}><Navigation size={15} /> Dùng vị trí hiện tại</button>
                  <button type="button" onClick={() => setShowMapPicker(true)}><Map size={15} /> Chọn trên bản đồ</button>
                </div>
                {locationError ? <p className="guest-location-error" role="alert">{locationError}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="guest-hero-mascot">
            <GuestMascotVideo />
          </div>
        </div>
      </section>

      <div className="guest-shell guest-content">
        <div className="guest-category-row" id="hidden-gems" role="group" aria-label="Khám phá theo món ăn">
          <button
            type="button"
            onClick={() => {
              setHiddenGemsOnly(false);
              setSelectedCuisineTab("all");
              setSelectedMainDishType("");
            }}
            aria-pressed={!hiddenGemsOnly && selectedCuisineTab === "all"}
            className={!hiddenGemsOnly && selectedCuisineTab === "all" ? "guest-category is-active" : "guest-category"}
          >
            Tất cả quán
          </button>
          <button
            type="button"
            onClick={() => {
              setHiddenGemsOnly(true);
              setSelectedCuisineTab("all");
              setSelectedMainDishType("");
            }}
            aria-pressed={hiddenGemsOnly}
            className={hiddenGemsOnly ? "guest-category is-active" : "guest-category"}
          >
            💎 Hidden Gems
          </button>
          {mainDishFilterOptions.slice(0, 6).map((mainDishType) => {
            const isSelected = !hiddenGemsOnly && selectedCuisineTab === mainDishType;
            return <button key={mainDishType} type="button" onClick={() => chooseCuisineTab(mainDishType)} aria-pressed={isSelected} className={isSelected ? "guest-category is-active" : "guest-category"}>{getCuisineEmoji(mainDishType)} {getCuisineLabel(mainDishType)}</button>;
          })}
          <button type="button" className={filtersExpanded ? "guest-category is-active" : "guest-category"} onClick={() => setFiltersExpanded((value) => !value)} aria-expanded={filtersExpanded}>Khác <ChevronDown size={14} /></button>
          <button type="button" className="guest-filter-button" onClick={() => setFiltersExpanded((value) => !value)} aria-expanded={filtersExpanded} aria-label="Mở bộ lọc tìm kiếm"><Tag size={15} /> Lọc</button>
        </div>

        {filtersExpanded ? (
          <div className="guest-filter-panel">
            <div className="guest-more-categories">
              <button
                type="button"
                onClick={() => {
                  setHiddenGemsOnly(false);
                  setSelectedCuisineTab("all");
                  setSelectedMainDishType("");
                }}
                aria-pressed={!hiddenGemsOnly && selectedCuisineTab === "all"}
                className={!hiddenGemsOnly && selectedCuisineTab === "all" ? "guest-category is-active" : "guest-category"}
              >
                Tất cả món
              </button>
              <button
                type="button"
                onClick={() => {
                  setHiddenGemsOnly(false);
                  setSelectedCuisineTab("combo");
                  setSelectedMainDishType("");
                }}
                aria-pressed={!hiddenGemsOnly && selectedCuisineTab === "combo"}
                className={!hiddenGemsOnly && selectedCuisineTab === "combo" ? "guest-category is-active" : "guest-category"}
              >
                🔥 Combo tiết kiệm
              </button>
              {mainDishFilterOptions.slice(6).map((mainDishType) => (
                <button key={mainDishType} type="button" onClick={() => chooseCuisineTab(mainDishType)} aria-pressed={!hiddenGemsOnly && selectedCuisineTab === mainDishType} className={!hiddenGemsOnly && selectedCuisineTab === mainDishType ? "guest-category is-active" : "guest-category"}>{getCuisineEmoji(mainDishType)} {getCuisineLabel(mainDishType)}</button>
              ))}
            </div>
            <label><span>Sắp xếp</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="distance">Gần bạn nhất</option><option value="rating">Đánh giá cao nhất</option><option value="reviews">Nhiều đánh giá nhất</option><option value="combo">Có combo ưu đãi</option></select></label>
            <label><span>Mức giá</span><select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}><option value="">Tất cả mức giá</option>{discoveryOptions.priceRanges.map((price) => <option key={price} value={price}>{price}</option>)}</select></label>
            <label><span>Loại hình quán</span><select value={restaurantFilter} onChange={(event) => setRestaurantFilter(event.target.value)}><option value="">Tất cả loại hình</option>{discoveryOptions.restaurantTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            {discoveryOptionsError ? <p className="guest-filter-error" role="status">{discoveryOptionsError}</p> : null}
            {hasActiveFilters ? <button type="button" className="guest-reset-filters" onClick={resetDiscoveryFilters}><RotateCcw size={14} /> Xóa bộ lọc</button> : null}
          </div>
        ) : null}

        <section className="guest-discovery" id="discover" aria-labelledby="guest-discovery-heading">
          <div className="guest-section-heading">
            <div><p className="guest-eyebrow">UFind Discovery</p><h2 id="guest-discovery-heading">Quán đáng khám phá quanh bạn</h2><p>Những địa điểm chất lượng nhưng chưa được nhiều người biết đến.</p></div>
            <div className="guest-section-actions"><span aria-live="polite">{loading ? "Đang tìm địa điểm..." : displayedMerchants.length + " địa điểm"}</span><a href="#nearby">Xem tất cả <ArrowRight size={15} /></a></div>
          </div>

          {loading ? (
            <div className="guest-loading"><LoaderCircle className="animate-spin" size={26} /><span>Đang tìm quán ngon quanh bạn...</span></div>
          ) : error ? (
            <div className="guest-empty" role="alert"><Store size={24} /><strong>Chưa tải được danh sách quán</strong><span>{error}</span></div>
          ) : displayedMerchants.length === 0 ? (
            <div className="guest-empty"><Compass size={25} /><strong>{hiddenGemsOnly ? "Chưa tìm thấy Hidden Gem phù hợp" : "Chưa tìm thấy quán phù hợp"}</strong><span>Thử đổi nhóm món, từ khóa hoặc khu vực khám phá.</span></div>
          ) : (
            <div className="guest-merchant-grid">
              {displayedMerchants.slice(0, 5).map((merchant, index) => (
                <button key={merchant.id} type="button" onClick={() => void openMerchant(merchant)} className="guest-merchant-card">
                  <span className="guest-card-heart" aria-hidden="true"><Heart size={17} /></span>
                  <MerchantVisual merchant={merchant} index={index} />
                  <span className="guest-distance">{typeof merchant.distance === "number" ? formatDistance(merchant.distance) : ""}</span>
                  <span className="guest-merchant-info"><strong>{merchant.name || "Chưa cập nhật tên quán"}</strong><span>{merchant.restaurantType || merchant.mainDishType || "Chưa cập nhật"}{merchant.priceRange ? ` · ${merchant.priceRange}` : ""}</span><span className="guest-rating"><Star size={14} fill="currentColor" /> {merchant.rating?.toFixed(1) ?? "Chưa có đánh giá"}{typeof merchant.reviewCount === "number" ? <> <i /> {merchant.reviewCount} đánh giá</> : null}</span></span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="guest-nearby" id="nearby" aria-labelledby="guest-nearby-heading">
          <div className="guest-nearby-heading">
            <div className="guest-pin-mark"><MapPin size={20} fill="currentColor" /></div>
            <div><h2 id="guest-nearby-heading">Khám phá quanh bạn</h2><p>Xem các địa điểm trên bản đồ và tìm quán ngon gần nhất.</p></div>
            <button type="button" onClick={() => setShowMapPicker(true)}>Xem bản đồ lớn <ArrowRight size={15} /></button>
          </div>
          <div className="guest-nearby-body">
            <div className="guest-map-canvas">
              <NearbyMerchantsMap
                center={coords}
                merchants={displayedMerchants}
                selectedMerchantId={selectedMerchantId}
                onSelectMerchantId={(id) => {
                  setSelectedMerchantId(id);
                  const merchant = merchants.find((item) => item.id === id);
                  if (merchant) void openMerchant(merchant);
                }}
              />
              <span className="guest-map-current"><span />{locationLabel}</span>
            </div>
            <div className="guest-map-list">
              {displayedMerchants.slice(0, 3).map((merchant) => {
                const thumb = merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl || merchant.logoUrl;
                return (
                  <button key={merchant.id} type="button" className={selectedMerchantId === merchant.id ? "guest-map-item is-selected" : "guest-map-item"} onClick={() => { setSelectedMerchantId(merchant.id); void openMerchant(merchant); }}>
                    <span className="guest-map-thumb">{thumb ? <img src={thumb} alt="" /> : <Store size={18} />}</span>
                    <span className="guest-map-copy"><strong>{merchant.name || "Chưa cập nhật tên quán"}</strong><small>{merchant.restaurantType || merchant.mainDishType || "Chưa cập nhật"}{merchant.priceRange ? ` · ${merchant.priceRange}` : ""}</small><span className="guest-rating"><Star size={13} fill="currentColor" /> {merchant.rating?.toFixed(1) ?? "Chưa có đánh giá"}{typeof merchant.reviewCount === "number" ? <> <i /> {merchant.reviewCount} đánh giá</> : null}</span></span>
                    <small className="guest-map-distance">{typeof merchant.distance === "number" ? formatDistance(merchant.distance) : ""}</small>
                  </button>
                );
              })}
              {!displayedMerchants.length ? <div className="guest-map-empty">{error ? "Không có dữ liệu quán để hiển thị trên bản đồ." : "Không có quán phù hợp với bộ lọc hiện tại."}</div> : null}
            </div>
          </div>
        </section>

        <section className="guest-how" aria-labelledby="guest-how-heading">
          <h2 id="guest-how-heading">Vì sao review trên UFind đáng tin hơn?</h2>
          <div className="guest-how-steps">
            <article><span className="guest-how-icon is-search"><Search size={27} /></span><div><strong>Khám phá</strong><p>Những quán thật, trải nghiệm thật từ cộng đồng.</p></div><ArrowRight className="guest-how-arrow" size={20} /></article>
            <article><span className="guest-how-icon is-place"><MapPin size={25} fill="currentColor" /></span><div><strong>Ghé quán thật</strong><p>Chỉ những đánh giá từ người đã ghé (Verified Visit).</p></div><ArrowRight className="guest-how-arrow" size={20} /></article>
            <article><span className="guest-how-icon is-star"><Star size={27} fill="currentColor" /></span><div><strong>Review chân thực</strong><p>Chia sẻ cảm nhận, giúp bạn tìm được những địa điểm xứng đáng.</p></div></article>
          </div>
        </section>

        {sponsoredLoading || sponsoredError || sponsoredMerchants.length > 0 ? (
          <section className="guest-sponsored" aria-label="Địa điểm được tài trợ">
            {renderSponsoredSection()}
          </section>
        ) : null}

        <section className="guest-signup-cta">
          <div><p className="guest-eyebrow">UFind community</p><h2>Tìm được quán đáng thử rồi?</h2><p>Tạo tài khoản để lưu lại, chia sẻ trải nghiệm và khám phá thêm nhiều Hidden Gems khác.</p></div>
          <Link to="/register">Tạo tài khoản <ArrowRight size={16} /></Link>
        </section>
      </div>
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
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />{" "}
                  Thông tin công khai
                </span>
                <h2
                  id="guest-merchant-title"
                  className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl"
                >
                  {detail.name || "Quán trên UFind"}
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
                <h3 className="text-base font-black text-slate-950 dark:text-white">
                  Thực đơn công khai
                </h3>
                {detailLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-cyan-500 dark:text-cyan-400" />
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(detail.foods ?? detail.menu ?? []).slice(0, 6).map((food) => {
                  const isCombo = food.isCombo;
                  const origPrice = Number(food.originalPrice || 0);
                  const price = Number(food.price || 0);
                  const discountPct =
                    isCombo && origPrice > price
                      ? Math.round(((origPrice - price) / origPrice) * 100)
                      : 0;

                  return (
                    <div
                      key={food.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-slate-950/60 p-4"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCombo && (
                          <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] uppercase tracking-wider">
                            Combo
                          </span>
                        )}
                        {food.servingSize && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            👥 {food.servingSize}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-slate-950 dark:text-white mt-1">
                        {food.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black text-cyan-600 dark:text-cyan-400">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(food.price)}
                        </span>
                        {discountPct > 0 && (
                          <>
                            <span className="text-[10px] font-mono text-slate-400 line-through">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(origPrice)}
                            </span>
                            <span className="px-1 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-[9px]">
                              -{discountPct}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-cyan-900 via-slate-900 to-indigo-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between border border-cyan-500/20 shadow-xl">
              <div>
                <p className="text-sm font-black">
                  Đặt món & Trải nghiệm đầy đủ?
                </p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Đăng nhập tài khoản UFind để bắt đầu ngay.
                </p>
              </div>
              <Link
                to={`/login?returnUrl=${encodeURIComponent(
                  `/customer/merchants/${detail.id}?backTo=${encodeURIComponent("/customer")}${
                    detail.isSponsored && detail.sponsoredCampaign
                      ? `&campaignId=${encodeURIComponent(detail.sponsoredCampaign.id)}`
                      : ""
                  }`,
                )}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 transition hover:bg-cyan-400 active:scale-95"
              >
                Đăng nhập <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      <VietMapLocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialCoords={coords}
        initialAddress={locationLabel}
        onConfirm={(pickedCoords, pickedAddress) => {
          applyLocation(pickedCoords, pickedAddress, "custom");
        }}
      />
    </main>
  );
}
