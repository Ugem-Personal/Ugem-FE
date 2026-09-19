import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
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
import { isMerchantHiddenGem } from "../utils/underratedScore";
import { getReviewsByMerchantId, type Review } from "@/features/review/services";
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

const MAP_PICKER_DEFAULT_COORDS: Coords = {
  latitude: 16,
  longitude: 108,
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

const MASCOT_LOOP_CROSSFADE_SECONDS = 1.45;
const MASCOT_LOOP_CROSSFADE_MS = 520;

function GuestMascotVideo() {
  const videosRef = useRef<Array<HTMLVideoElement | null>>([null, null]);
  const activeIndexRef = useRef(0);
  const transitioningRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const monitorFrameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (monitorFrameRef.current !== null) {
        window.cancelAnimationFrame(monitorFrameRef.current);
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
    if (nextVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      nextVideo.currentTime = 0;
    }

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

  useEffect(() => {
    const monitor = () => {
      const activeIndex = activeIndexRef.current;
      const video = videosRef.current[activeIndex];
      if (video && !video.paused && Number.isFinite(video.duration)) {
        blendIntoNextGreeting(activeIndex);
      }
      monitorFrameRef.current = window.requestAnimationFrame(monitor);
    };

    monitorFrameRef.current = window.requestAnimationFrame(monitor);
    return () => {
      if (monitorFrameRef.current !== null) {
        window.cancelAnimationFrame(monitorFrameRef.current);
      }
    };
  }, []);

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
            loop
            preload="auto"
            aria-hidden="true"
            onTimeUpdate={() => blendIntoNextGreeting(index)}
            onEnded={() => blendIntoNextGreeting(index, true)}
          >
            <source src="/videos/greeting2.mp4" type="video/mp4" />
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

function normalizeCuisineText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi-VN");
}

function getCuisineSearchTerms(category: string) {
  const label = normalizeCuisineText(getCuisineLabel(category));
  const aliases: Record<string, string[]> = {
    com: ["com"],
    "bun, pho": ["bun", "pho", "mi", "mien", "hu tieu"],
    "banh mi": ["banh mi", "xoi", "burger", "hamburger", "sandwich"],
    "an vat": ["an vat", "trang mieng", "che", "banh trang", "kem", "snack"],
    "do uong": ["do uong", "tra sua", "ca phe", "cafe", "coffee", "sinh to", "nuoc ep"],
    "lau, nuong": ["lau", "nuong", "bbq", "barbecue"],
    "mon chay": ["chay", "thuc duong", "vegetarian"],
    "mon viet": ["mon viet", "dac san", "mam com"],
    "han, nhat": ["han", "nhat", "thai", "korean", "japanese", "sushi", "ramen"],
    "mon au": ["mon au", "pizza", "pasta", "steak", "burger"],
  };
  const examples = category.match(/\(([^)]*)\)/)?.[1]
    .split(/[,;|/&]|\bvà\b/i)
    .map((term) => normalizeCuisineText(term.trim())) ?? [];
  const base = normalizeCuisineText(category.replace(/\s*\([^)]*\)/g, "").trim());

  return Array.from(new Set([...(aliases[label] ?? [base]), ...examples, base]))
    .filter((term) => term.length >= 2);
}

function matchesCuisineCategory(merchant: Merchant, category: string) {
  const menuText = [
    merchant.mainDishType,
    merchant.description,
    ...(merchant.featuredFoods ?? []),
    ...(merchant.menu ?? []).flatMap((food) => [
      food.name,
      food.description,
      ...(food.categoryDetail ?? []),
    ]),
  ]
    .filter(Boolean)
    .map((value) => normalizeCuisineText(value ?? ""))
    .join(" | ");

  return getCuisineSearchTerms(category).some((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escapedTerm}(?:$|[^a-z0-9])`).test(menuText);
  });
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

function getDistanceInKilometers(from: Coords | null, to: Coords) {
  if (!from || !isValidVietnamCoords(from) || !isValidVietnamCoords(to)) {
    return undefined;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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
  const isHiddenGem = isMerchantHiddenGem(merchant);

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
  const [activePrimaryNav, setActivePrimaryNav] = useState<
    "explore" | "nearby" | "hidden-gems"
  >("explore");
  const [selectedMainDishType, setSelectedMainDishType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>("custom");
  const [locationLabel, setLocationLabel] = useState("Đang xác định vị trí…");
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReviews, setDetailReviews] = useState<Review[]>([]);
  const [detailReviewsLoading, setDetailReviewsLoading] = useState(false);
  const [detailReviewsError, setDetailReviewsError] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const autoLocationRequestedRef = useRef(false);
  const locationSelectionVersionRef = useRef(0);
  const detailRequestVersionRef = useRef(0);

  useEffect(() => {
    const syncNavigationFromHash = () => {
      if (window.location.hash === "#hidden-gems") {
        setActivePrimaryNav("hidden-gems");
        setHiddenGemsOnly(true);
        setSelectedCuisineTab("all");
        setSelectedMainDishType("");
      } else if (window.location.hash === "#nearby") {
        setActivePrimaryNav("nearby");
      } else if (window.location.hash === "#explore") {
        setActivePrimaryNav("explore");
        setHiddenGemsOnly(false);
        setSelectedCuisineTab("all");
        setSelectedMainDishType("");
      }
    };

    syncNavigationFromHash();
    window.addEventListener("hashchange", syncNavigationFromHash);
    return () => window.removeEventListener("hashchange", syncNavigationFromHash);
  }, []);

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
        proximity: coords
          ? { lat: coords.latitude, lng: coords.longitude }
          : undefined,
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
  }, [coords, editingLocation, locationInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSponsoredLoading(true);
    setSponsoredError("");

    if (!coords) {
      setMerchants([]);
      setSponsoredMerchants([]);
      setLoading(false);
      setSponsoredLoading(false);
      return () => {
        active = false;
      };
    }

    const query = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      keyword: activeKeyword || undefined,
      priceRange: priceRange || undefined,
      restaurantType: restaurantFilter || undefined,
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
    coords,
    priceRange,
    requestVersion,
    restaurantFilter,
  ]);

  useEffect(() => {
    if (!detail) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMerchantDetail();
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
      list = list.filter(isMerchantHiddenGem);
    }
    if (selectedCuisineTab === "combo") {
      list = list.filter((m) => m.menu?.some((food) => food.isCombo));
    }
    if (selectedMainDishType) {
      list = list.filter((merchant) =>
        matchesCuisineCategory(merchant, selectedMainDishType),
      );
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
  }, [hiddenGemsOnly, merchants, selectedCuisineTab, selectedMainDishType, sortBy]);

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
    if (!coords) {
      setEditingLocation(true);
      setLocationError("Hãy bật GPS hoặc chọn khu vực trước khi tìm quán.");
      return;
    }
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
      setLocationLabel("Chọn khu vực tìm kiếm");
      setEditingLocation(true);
      return false;
    }

    locationSelectionVersionRef.current += 1;
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

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      setLocationLabel("Chọn khu vực tìm kiếm");
      setEditingLocation(true);
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
        setLocationBusy(false);
        if (!applyLocation(nextCoords, "Vị trí hiện tại", "current")) return;
        const selectionVersion = locationSelectionVersionRef.current;
        void reverseGeocode(nextCoords.latitude, nextCoords.longitude)
          .then((result) => {
            const address = cleanAddress(result?.address || "");
            if (address && selectionVersion === locationSelectionVersionRef.current) {
              setLocationLabel(address);
            }
          })
          .catch(() => undefined);
      },
      (error) => {
        setLocationBusy(false);
        setLocationLabel("Chọn khu vực tìm kiếm");
        setEditingLocation(true);
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Bạn chưa cấp quyền vị trí. Hãy bật quyền định vị hoặc nhập khu vực muốn tìm."
          : "Chưa xác định được vị trí. Hãy thử lại hoặc nhập khu vực muốn tìm.");
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  // The ref keeps the automatic GPS prompt to one request in React StrictMode.
  useEffect(() => {
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    requestCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            proximity: coords
              ? { lat: coords.latitude, lng: coords.longitude }
              : undefined,
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

  function closeMerchantDetail() {
    detailRequestVersionRef.current += 1;
    setDetail(null);
    setDetailLoading(false);
    setDetailReviews([]);
    setDetailReviewsLoading(false);
    setDetailReviewsError(false);
  }

  async function openMerchant(merchant: Merchant) {
    const requestVersion = ++detailRequestVersionRef.current;
    setDetailLoading(true);
    setDetailReviewsLoading(true);
    setDetailReviews([]);
    setDetailReviewsError(false);
    setDetail({ ...merchant, foods: merchant.menu ?? [] });
    const [merchantResult, reviewsResult] = await Promise.allSettled([
      getMerchantDetail(merchant.id),
      getReviewsByMerchantId(merchant.id),
    ]);

    if (requestVersion !== detailRequestVersionRef.current) return;

    if (merchantResult.status === "fulfilled") {
      const detailResult = merchantResult.value;
      const knownDistance = [detailResult.distance, merchant.distance].find(
        (distance): distance is number =>
          typeof distance === "number" && Number.isFinite(distance) && distance >= 0,
      );
      const merchantLatitude = Number(
        detailResult.latitude ?? detailResult.lat ?? merchant.latitude ?? merchant.lat,
      );
      const merchantLongitude = Number(
        detailResult.longitude ?? detailResult.lng ?? merchant.longitude ?? merchant.lng,
      );
      const calculatedDistance = getDistanceInKilometers(coords, {
        latitude: merchantLatitude,
        longitude: merchantLongitude,
      });
      const detailWithSummary = {
        ...merchant,
        ...detailResult,
        distance: knownDistance ?? calculatedDistance,
      };
      setDetail(
        merchant.isSponsored && merchant.sponsoredCampaign
          ? {
              ...detailWithSummary,
              discoveryType: "Sponsored",
              isSponsored: true,
              sponsoredCampaign: merchant.sponsoredCampaign,
            }
          : detailWithSummary,
      );
    }

    setDetailReviews(reviewsResult.status === "fulfilled" ? reviewsResult.value : []);
    setDetailReviewsError(reviewsResult.status === "rejected");
    setDetailLoading(false);
    setDetailReviewsLoading(false);
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
          <nav className="guest-primary-nav" aria-label="Điều hướng chính">
            <a
              href="#explore"
              className={activePrimaryNav === "explore" ? "is-active" : undefined}
              aria-current={activePrimaryNav === "explore" ? "location" : undefined}
              onClick={() => {
                setActivePrimaryNav("explore");
                setHiddenGemsOnly(false);
                setSelectedCuisineTab("all");
                setSelectedMainDishType("");
              }}
            >
              Khám phá
            </a>
            <a
              href="#nearby"
              className={activePrimaryNav === "nearby" ? "is-active" : undefined}
              aria-current={activePrimaryNav === "nearby" ? "location" : undefined}
              onClick={() => setActivePrimaryNav("nearby")}
            >
              Gần bạn
            </a>
            <a
              href="#hidden-gems"
              className={activePrimaryNav === "hidden-gems" ? "is-active" : undefined}
              aria-current={activePrimaryNav === "hidden-gems" ? "location" : undefined}
              onClick={() => {
                setActivePrimaryNav("hidden-gems");
                setHiddenGemsOnly(true);
                setSelectedCuisineTab("all");
                setSelectedMainDishType("");
              }}
            >
              Hidden Gems
            </a>
          </nav>
          <div className="guest-account-nav"><Link to="/login" className="guest-login">Đăng nhập</Link><Link to="/register" className="guest-register">Đăng ký</Link></div>
        </div>
      </header>

      <section className="guest-hero" id="explore">
        <div className="guest-shell guest-hero-grid">
          <div className="guest-hero-copy">
            <span className="guest-hero-badge"><Sparkles size={16} /> Khám phá quán ngon theo vị trí của bạn</span>
            <h1>Quán ngon đôi khi nằm ở <span>những góc phố ít người để&nbsp;ý.</span></h1>
            <p>Tìm địa điểm hợp gu qua đánh giá và trải nghiệm thật từ cộng đồng UFind.</p>
            <form onSubmit={handleSearch} className="guest-search">
              <div className="guest-search-input">
                <Search size={19} aria-hidden="true" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm món ăn hoặc tên quán..." aria-label="Tìm món ăn hoặc tên quán" />
                {keyword ? <button type="button" onClick={() => setKeyword("")} aria-label="Xóa từ khóa"><X size={16} /></button> : null}
              </div>
              <button type="button" className="guest-search-location" onClick={() => setEditingLocation((value) => !value)} aria-expanded={editingLocation} aria-label={`${locationMode === "current" ? "Đang dùng vị trí GPS" : "Khu vực tìm kiếm"}: ${locationLabel}. Nhấn để thay đổi.`} title={locationLabel}>
                <MapPin size={18} /><span>{locationLabel}</span><ChevronDown size={15} />
              </button>
              <button type="submit" className="guest-search-submit">Khám phá <ArrowRight size={17} /></button>
            </form>

            {editingLocation ? (
              <div className="guest-location-editor">
                <p className="guest-location-label">Bạn muốn tìm ở đâu?</p>
                <form onSubmit={applyManualLocation} className="guest-location-form">
                  <label>
                    <span className="sr-only">Khu vực muốn tìm</span>
                    <input value={locationInput} onChange={(event) => { setLocationInput(event.target.value); setLocationSuggestions([]); setLocationSuggesting(false); setLocationError(""); setLocationSuggestionError(""); }} placeholder="Ví dụ: Phường Bến Nghé, Quận 1" autoComplete="off" aria-autocomplete="list" aria-expanded={locationSuggestions.length > 0} aria-controls="guest-location-suggestions" aria-invalid={Boolean(locationError || locationSuggestionError)} />
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
                  <button type="button" onClick={requestCurrentLocation} disabled={locationBusy}><Navigation size={15} /> Dùng vị trí GPS</button>
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
        <div className="guest-category-row" role="group" aria-label="Khám phá theo món ăn">
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

        <section className="guest-discovery" id="hidden-gems" aria-labelledby="guest-discovery-heading">
          <div className="guest-section-heading">
            <div><p className="guest-eyebrow">UFind Discovery</p><h2 id="guest-discovery-heading">Hidden Gems được cộng đồng yêu thích</h2><p>Địa điểm chất lượng, được chọn lọc từ trải nghiệm thực tế.</p></div>
            <div className="guest-section-actions"><span aria-live="polite">{loading ? "Đang tìm địa điểm..." : displayedMerchants.length + " địa điểm"}</span><a href="#nearby">Xem tất cả <ArrowRight size={15} /></a></div>
          </div>

          {loading ? (
            <div className="guest-loading"><LoaderCircle className="animate-spin" size={26} /><span>Đang tìm quán ngon quanh bạn...</span></div>
          ) : !coords ? (
            <div className="guest-empty"><MapPin size={24} /><strong>Chọn vị trí để bắt đầu khám phá</strong><span>Bật GPS hoặc nhập khu vực bạn muốn tìm.</span><button type="button" onClick={() => setEditingLocation(true)}>Chọn khu vực</button></div>
          ) : error ? (
            <div className="guest-empty" role="alert"><Store size={24} /><strong>Chưa tải được danh sách quán</strong><span>{error}</span></div>
          ) : displayedMerchants.length === 0 ? (
            <div className="guest-empty">
              <Compass size={25} />
              <strong>{hiddenGemsOnly ? "Chưa có Hidden Gem phù hợp quanh bạn" : selectedMainDishType ? `Chưa tìm thấy quán có món ${getCuisineLabel(selectedMainDishType)}` : "Chưa tìm thấy quán phù hợp"}</strong>
              <span>{hiddenGemsOnly ? merchants.length ? `Danh sách đã tự tải ${merchants.length} quán quanh bạn, nhưng chưa có quán nào được phân loại là Hidden Gem.` : "Chưa có quán nào trong kết quả tìm kiếm hiện tại được phân loại là Hidden Gem." : selectedMainDishType ? "Bộ lọc đang dò trong loại món và thực đơn của quán, không dựa vào tên quán." : "Thử đổi nhóm món, từ khóa hoặc khu vực khám phá."}</span>
              {hiddenGemsOnly && merchants.length > 0 ? <a className="guest-empty-action" href="#explore" onClick={() => { setHiddenGemsOnly(false); setActivePrimaryNav("explore"); }}>Xem tất cả quán quanh bạn</a> : null}
            </div>
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
            <div><h2 id="guest-nearby-heading">Bản đồ quán ăn</h2><p>Xem địa chỉ và khoảng cách để chọn điểm ghé thuận tiện.</p></div>
            <button type="button" onClick={() => setShowMapPicker(true)}>Xem bản đồ lớn <ArrowRight size={15} /></button>
          </div>
          <div className="guest-nearby-body">
            <div className="guest-map-canvas">
              {coords ? (
                <>
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
                  <span className="guest-map-current" title={locationLabel}><span />{locationLabel}</span>
                </>
              ) : (
                <div className="guest-map-no-location">
                  <MapPin size={28} />
                  <strong>Chọn vị trí để xem quán gần bạn</strong>
                  <p>Bật GPS hoặc nhập khu vực muốn khám phá.</p>
                  <button type="button" onClick={() => setEditingLocation(true)}>Chọn khu vực</button>
                </div>
              )}
            </div>
            <div className="guest-map-list">
              {displayedMerchants.slice(0, 3).map((merchant) => {
                const thumb = merchant.menu?.find((item) => item.imageUrl?.trim())?.imageUrl || merchant.logoUrl;
                return (
                  <button key={merchant.id} type="button" className={selectedMerchantId === merchant.id ? "guest-map-item is-selected" : "guest-map-item"} onClick={() => { setSelectedMerchantId(merchant.id); void openMerchant(merchant); }}>
                    <span className="guest-map-thumb">{thumb ? <img src={thumb} alt="" /> : <Store size={18} />}</span>
                    <span className="guest-map-copy"><strong>{merchant.name || "Chưa cập nhật tên quán"}</strong>{merchant.address ? <small>{cleanAddress(merchant.address)}</small> : null}<small>{merchant.restaurantType || merchant.mainDishType || "Chưa cập nhật"}{merchant.priceRange ? ` · ${merchant.priceRange}` : ""}</small><span className="guest-rating"><Star size={13} fill="currentColor" /> {merchant.rating?.toFixed(1) ?? "Chưa có đánh giá"}{typeof merchant.reviewCount === "number" ? <> <i /> {merchant.reviewCount} đánh giá</> : null}</span></span>
                    <small className="guest-map-distance">{typeof merchant.distance === "number" ? formatDistance(merchant.distance) : ""}</small>
                  </button>
                );
              })}
              {!displayedMerchants.length ? <div className="guest-map-empty">{!coords ? "Địa chỉ quán sẽ hiện ở đây sau khi bạn chọn vị trí." : error ? "Không có dữ liệu quán để hiển thị trên bản đồ." : "Không có quán phù hợp với bộ lọc hiện tại."}</div> : null}
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
          className="fixed inset-0 z-50 grid place-items-center bg-[#17231E]/55 p-3 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={closeMerchantDetail}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-merchant-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-black/[0.06] bg-[#FCFCF9] p-5 text-[#17231E] shadow-[0_30px_100px_rgba(0,0,0,.22)] sm:p-8"
          >
            <button
              type="button"
              onClick={closeMerchantDetail}
              className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#56615B] shadow-sm backdrop-blur transition hover:bg-white hover:text-[#17231E]"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-4 pr-12 sm:pr-14">
              {(() => {
                return isMerchantHiddenGem(detail) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F3D8] px-3 py-1.5 text-[11px] font-extrabold text-[#59621D]">
                    <Sparkles className="h-3.5 w-3.5 text-[#B28A00]" />
                    Hidden Gem
                  </span>
                ) : null;
              })()}
              <h2
                id="guest-merchant-title"
                className="break-words text-2xl font-black tracking-tight text-[#17231E] sm:text-3xl"
              >
                {detail.name || "Quán trên UFind"}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#68736D]">
                {typeof detail.rating === "number" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-[#D6A900] text-[#D6A900]" />
                    <strong className="text-[#26322C]">{detail.rating.toFixed(1)}</strong>
                    {typeof detail.reviewCount === "number" ? (
                      <span>· {detail.reviewCount} đánh giá</span>
                    ) : null}
                  </span>
                ) : null}
                {typeof detail.checkInCount === "number" ? (
                  <span className="font-semibold">✓ {detail.checkInCount} lượt ghé</span>
                ) : null}
                {typeof detail.distance === "number" ? (
                  <span className="font-semibold">{formatDistance(detail.distance)} từ bạn</span>
                ) : null}
              </div>
              {detail.address ? (
                <p className="flex items-start gap-2 break-words text-sm leading-6 text-[#66716B]">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#176642]" />
                  <span>{cleanAddress(detail.address)}</span>
                </p>
              ) : null}
              {detail.description ? (
                <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-[#68736D]">
                  {detail.description}
                </p>
              ) : null}
            </div>

            <section className="mt-7" aria-labelledby="guest-featured-foods-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3 id="guest-featured-foods-title" className="text-xl font-black tracking-tight text-[#17231E]">
                    Món nổi bật
                  </h3>
                  <p className="mt-1 text-xs text-[#7A847F]">
                    Tham khảo một số món hiện có tại quán.
                  </p>
                </div>
                {detailLoading ? <LoaderCircle className="mb-1 h-4 w-4 animate-spin text-[#176642]" /> : null}
              </div>
              {(detail.foods ?? detail.menu ?? []).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(detail.foods ?? detail.menu ?? []).slice(0, 6).map((food) => {
                    const originalPrice = Number(food.originalPrice || 0);
                    const price = Number(food.price || 0);
                    const discountPercent =
                      food.isCombo && originalPrice > price
                        ? Math.round(((originalPrice - price) / originalPrice) * 100)
                        : 0;

                    return (
                      <article
                        key={food.id}
                        className="group overflow-hidden rounded-[16px] border border-black/[0.06] bg-white transition hover:border-emerald-900/15 hover:shadow-sm"
                      >
                        {food.imageUrl ? (
                          <div className="aspect-[16/9] overflow-hidden bg-[#EEF0EA]">
                            <img
                              src={food.imageUrl}
                              alt={food.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <div className="p-4">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            {food.isCombo ? (
                              <span className="rounded-full bg-[#F6F3D8] px-2 py-0.5 text-[10px] font-bold text-[#59621D]">Combo</span>
                            ) : null}
                            {food.servingSize ? (
                              <span className="text-[10px] font-semibold text-[#7A847F]">{food.servingSize}</span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 text-sm font-extrabold text-[#202B25]">{food.name}</p>
                          {food.price != null ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-[#176642]">
                                {Number(food.price).toLocaleString("vi-VN")}đ
                              </p>
                              {discountPercent > 0 ? (
                                <>
                                  <span className="text-xs text-[#98A09B] line-through">
                                    {originalPrice.toLocaleString("vi-VN")}đ
                                  </span>
                                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                    -{discountPercent}%
                                  </span>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : detailLoading ? (
                <div className="rounded-[16px] border border-dashed border-black/[0.08] px-5 py-8 text-center text-sm text-[#7A847F]">
                  Đang tải món từ quán…
                </div>
              ) : (
                <div className="rounded-[16px] border border-dashed border-black/[0.08] px-5 py-8 text-center text-sm text-[#7A847F]">
                  Quán chưa cập nhật món nổi bật.
                </div>
              )}
            </section>

            <section className="mt-8 border-t border-black/[0.06] pt-7" aria-labelledby="guest-community-reviews-title">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 id="guest-community-reviews-title" className="text-xl font-black tracking-tight text-[#17231E]">
                    Review từ cộng đồng
                  </h3>
                  <p className="mt-1 text-xs text-[#7A847F]">
                    Trải nghiệm được chia sẻ bởi khách đã ghé quán.
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 rounded-full bg-[#EAF3EB] px-3 py-1.5 text-xs font-bold text-[#176642] sm:flex">
                  <BadgeCheck className="h-4 w-4" />
                  Verified Visit
                </div>
              </div>

              {detailReviewsLoading ? (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-[16px] bg-[#F7F8F4] px-5 py-6 text-sm font-semibold text-[#58645E]">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải review…
                </div>
              ) : detailReviews.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {detailReviews.slice(0, 4).map((review) => (
                    <article key={review.reviewId} className="rounded-[16px] border border-black/[0.06] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {review.customerAvatarUrl ? (
                            <img src={review.customerAvatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EAF3EB] text-xs font-bold text-[#176642]">
                              {(review.customerName || "U").trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#26322C]">{review.customerName || "Khách hàng UFind"}</p>
                            {review.createdAt ? (
                              <p className="text-[11px] text-[#89928D]">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
                            ) : null}
                          </div>
                        </div>
                        {review.isVerifiedDiner ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF3EB] px-2 py-1 text-[10px] font-bold text-[#176642]">
                            <BadgeCheck className="h-3 w-3" /> Đã ghé
                          </span>
                        ) : null}
                      </div>
                      {typeof review.rating === "number" ? (
                        <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#26322C]">
                          <Star className="h-3.5 w-3.5 fill-[#D6A900] text-[#D6A900]" /> {review.rating.toFixed(1)}
                        </p>
                      ) : null}
                      {review.content ? <p className="mt-2 text-sm leading-6 text-[#58645E]">{review.content}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[16px] bg-[#F7F8F4] px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-[#58645E]">
                    {detailReviewsError
                      ? "Chưa tải được review. Vui lòng thử lại sau."
                      : "Chưa có review để hiển thị."}
                  </p>
                </div>
              )}
            </section>

            <div className="mt-8 flex flex-col gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#53615A]">
                <MapPin className="h-4 w-4 text-[#176642]" />
                {typeof detail.distance === "number"
                  ? `${formatDistance(detail.distance)} từ bạn`
                  : "Chưa xác định được khoảng cách"}
              </div>
              <Link
                to={`/login?returnUrl=${encodeURIComponent(
                  `/customer/merchants/${detail.id}?backTo=${encodeURIComponent("/customer")}${
                    detail.isSponsored && detail.sponsoredCampaign
                      ? `&campaignId=${encodeURIComponent(detail.sponsoredCampaign.id)}`
                      : ""
                  }`,
                )}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#176642] px-5 text-sm font-bold text-white transition hover:bg-[#105334] active:scale-[0.98]"
              >
                Đăng nhập để lưu <Heart className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      <VietMapLocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialCoords={coords ?? MAP_PICKER_DEFAULT_COORDS}
        initialAddress={locationLabel}
        onConfirm={(pickedCoords, pickedAddress) => {
          applyLocation(pickedCoords, pickedAddress, "custom");
        }}
      />
    </main>
  );
}
