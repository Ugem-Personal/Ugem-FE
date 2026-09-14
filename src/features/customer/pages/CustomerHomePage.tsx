import { SidebarToggle } from "@/shared/components/SidebarToggle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  Heart,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  X,
} from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { notify } from "@/shared/lib/notify";

import { cn } from "@/lib/utils";
import { BrandLogo, UserAccountMenu } from "@/shared/components";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  DEFAULT_DISCOVERY_OPTIONS,
  getDiscoveryOptions,
} from "@/shared/services/categoryService";
import type { DiscoveryOptions } from "@/shared/types";

import MerchantCard from "../components/MerchantCard";
import { MerchantCardSkeleton } from "../components/MerchantCardSkeleton";
import NearbyMerchantsMap from "../components/NearbyMerchantsMap";
import VietMapLocationPickerModal from "../components/VietMapLocationPickerModal";
import { getNearbyMerchants } from "../services/merchantService";
import { getWishlist } from "../services/wishlistService";
import { getCurrentUser } from "@/features/auth";
import type { Merchant } from "../types";
import { useVietMapRoute } from "@/shared/hooks/useVietMapRoute";
import { isMerchantOpenNow } from "@/shared/utils/openingHours";
import {
  metersToKm,
  secondsToText,
  searchGeocodeAddress,
  reverseGeocode,
} from "@/shared/services/vietmapService";

type Coords = { latitude: number; longitude: number };
type LocationResult = {
  coords: Coords;
  usedDefault: boolean;
  accuracy?: number;
  errorCode?: number;
  errorMessage?: string;
};
type MerchantRecord = Record<string, unknown>;
type LocationMode = "browser" | "manual" | "default";
type CustomerServiceMode = "delivery" | "dineIn";
const DEFAULT_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const CUISINE_QUICK_TABS = [
  { id: "all", label: "Tất cả món", query: "" },
  { id: "combo", label: "🔥 Combo Tiết Kiệm", query: "", isCombo: true },
  { id: "com", label: "🍛 Cơm", query: "Cơm" },
  { id: "bun-pho", label: "🍜 Bún, Phở, Mì", query: "Bún, Phở" },
  { id: "banh-mi", label: "🥖 Bánh mì & Fastfood", query: "Bánh mì" },
  { id: "tra-sua", label: "🧋 Trà sữa & Cà phê", query: "Trà sữa" },
  { id: "lau-nuong", label: "🍲 Lẩu & Đồ nướng", query: "Lẩu & Đồ nướng" },
  { id: "chay", label: "🥗 Món Chay", query: "Món Chay" },
  { id: "an-vat", label: "🍢 Ăn vặt", query: "Đồ ăn vặt" },
  { id: "mon-viet", label: "🥢 Món Việt truyền thống", query: "Món Việt" },
  { id: "han-nhat-thai", label: "🍣 Món Hàn / Nhật / Thái", query: "Món Hàn" },
  { id: "mon-au", label: "🍕 Món Âu", query: "Món Âu" },
];

type SortOption = "distance" | "rating" | "reviews" | "combo";
const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "distance", label: "📍 Gần tôi nhất" },
  { id: "rating", label: "⭐ Đánh giá cao nhất" },
  { id: "reviews", label: "🔥 Nhiều đánh giá nhất" },
  { id: "combo", label: "🍱 Ưu đãi & Combo hot" },
];

const LOCATION_SAMPLE_TIMEOUT_MS = 10_000;

function resolveLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ coords: DEFAULT_COORDS, usedDefault: true });
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastError: GeolocationPositionError | null = null;

    const finish = (fallbackToDefault = false) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId) clearTimeout(timeoutId);

      if (fallbackToDefault || !bestPosition) {
        resolve({
          coords: DEFAULT_COORDS,
          usedDefault: true,
          errorCode: lastError?.code,
          errorMessage: lastError?.message,
        });
        return;
      }

      resolve({
        coords: {
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
        },
        usedDefault: false,
        accuracy: bestPosition.coords.accuracy,
      });
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }
        finish();
      },
      (error) => {
        lastError = error;
        finish(bestPosition === null);
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_SAMPLE_TIMEOUT_MS,
        maximumAge: 0,
      },
    );

    timeoutId = setTimeout(
      () => finish(bestPosition === null),
      LOCATION_SAMPLE_TIMEOUT_MS,
    );
  });
}

function getNumberField(record: MerchantRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getLocationErrorMessage(result: LocationResult) {
  if (result.errorCode === 1) {
    return "Không lấy được vị trí hiện tại vì trình duyệt đang chặn quyền Location. Hãy Allow Location rồi reload trang.";
  }

  if (result.errorCode === 2) {
    return "Thiết bị chưa trả được vị trí hiện tại. Hãy bật GPS/Location Services rồi thử lại.";
  }

  if (result.errorCode === 3) {
    return "Lấy vị trí hiện tại bị timeout. Hãy bật GPS/Location Services hoặc thử lại sau vài giây.";
  }

  return "Không lấy được vị trí hiện tại. Hãy kiểm tra quyền Location.";
}

function getMerchantCoords(
  merchant: Merchant,
): { lat: number; lng: number } | null {
  const record = merchant as MerchantRecord;

  const lat = getNumberField(record, ["latitude", "lat", "Latitude", "Lat"]);
  const lng = getNumberField(record, ["longitude", "lng", "Longitude", "Lng"]);

  if (lat === null || lng === null) return null;

  return { lat, lng };
}

function distanceKm(a: Coords, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isGeocodedDistanceReasonable(
  userCoords: Coords,
  merchant: Merchant,
  candidate: { lat: number; lng: number },
) {
  if (
    typeof merchant.distance !== "number" ||
    !Number.isFinite(merchant.distance)
  ) {
    return true;
  }

  const actualDistance = distanceKm(userCoords, candidate);
  const expectedDistance = Math.max(merchant.distance, 0);
  const toleranceKm = Math.max(1.5, expectedDistance * 2 + 0.5);
  return Math.abs(actualDistance - expectedDistance) <= toleranceKm;
}

async function searchOriginSuggestions(
  text: string,
  coords: Coords,
  size: number,
) {
  return searchGeocodeAddress(text, {
    proximity: { lat: coords.latitude, lng: coords.longitude },
    size,
  });
}

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabIsMap =
    searchParams.get("tab") === "map" || searchParams.get("mode") === "dinein";

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [discoveryOptions, setDiscoveryOptions] = useState<DiscoveryOptions>(
    DEFAULT_DISCOVERY_OPTIONS,
  );
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedRadiusKm] = useState<number>(15);
  const [selectedRestaurantType, setSelectedRestaurantType] = useState("");
  const [selectedCuisineTab, setSelectedCuisineTab] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationAddress, setLocationAddress] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [hasCustomerLocation, setHasCustomerLocation] = useState(false);
  const [, setLocationMode] = useState<LocationMode>("default");
  const [, setLocationAccuracy] = useState<number | null>(null);
  const [originInput, setOriginInput] = useState("");
  const [appliedOriginInput, setAppliedOriginInput] = useState("");
  const [, setOriginSuggestions] = useState<unknown[]>([]);
  const [, setOriginSuggestionsOpen] = useState(false);
  const [, setOriginSuggesting] = useState(false);
  const [locatingCustomer, setLocatingCustomer] = useState(false);
  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS);
  const [candidateLocation, setCandidateLocation] = useState<Coords | null>(
    null,
  );
  const [, setCandidateAccuracy] = useState<number | null>(null);
  const [serviceMode, setServiceMode] = useState<CustomerServiceMode>(
    initialTabIsMap ? "dineIn" : "delivery",
  );
  const [showMap, setShowMap] = useState(initialTabIsMap);
  const [showMerchantPanel, setShowMerchantPanel] = useState(true);
  const [showRoutePanel, setShowRoutePanel] = useState(true);
  const initialMerchantId = searchParams.get("merchantId");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    initialMerchantId || null,
  );
  const [routeLoadingMerchantId, setRouteLoadingMerchantId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const targetMerchantId = searchParams.get("merchantId");
    if (targetMerchantId) {
      setSelectedMerchantId(targetMerchantId);
      setShowMap(true);
      setShowRoutePanel(true);
      setServiceMode("dineIn");
    }
  }, [searchParams]);

  const { route, clearRoute, routeResult } = useVietMapRoute();

  const selectedMerchant = useMemo(
    () =>
      merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null,
    [merchants, selectedMerchantId],
  );

  const [onlyOpenNow, setOnlyOpenNow] = useState(false);

  const displayedMerchants = useMemo(() => {
    let list = merchants;

    if (onlyOpenNow) {
      list = list.filter((m) => isMerchantOpenNow(m.openingHours));
    }

    if (selectedRestaurantType) {
      const typeLower = selectedRestaurantType.toLowerCase();
      list = list.filter(
        (m) =>
          m.restaurantType?.toLowerCase().includes(typeLower) ||
          m.description?.toLowerCase().includes(typeLower),
      );
    }

    if (selectedPriceRange) {
      list = list.filter((m) => m.priceRange === selectedPriceRange);
    }

    if (selectedCuisineTab === "combo") {
      list = list.filter(
        (m) =>
          m.menu?.some((food) => food.isCombo) ||
          m.featuredFoods?.some((f) => f.toLowerCase().includes("combo")),
      );
    } else if (selectedCuisineTab !== "all") {
      const tabObj = CUISINE_QUICK_TABS.find((t) => t.id === selectedCuisineTab);
      if (tabObj?.query) {
        const queryTerms = tabObj.query.toLowerCase().split(",").map((s) => s.trim());
        list = list.filter((m) => {
          const text = [
            m.name,
            m.description,
            m.restaurantType,
            ...(m.featuredFoods || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return queryTerms.some((term) => text.includes(term));
        });
      }
    }

    const sorted = [...list].sort((a, b) => {
      const aOpen = isMerchantOpenNow(a.openingHours) ? 1 : 0;
      const bOpen = isMerchantOpenNow(b.openingHours) ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;

      if (sortBy === "distance") {
        const distA = typeof a.distance === "number" && Number.isFinite(a.distance) ? a.distance : 9999;
        const distB = typeof b.distance === "number" && Number.isFinite(b.distance) ? b.distance : 9999;
        if (distA !== distB) return distA - distB;
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "rating") {
        const ratingA = typeof a.rating === "number" ? a.rating : 0;
        const ratingB = typeof b.rating === "number" ? b.rating : 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        const revA = a.reviewCount ?? 0;
        const revB = b.reviewCount ?? 0;
        if (revB !== revA) return revB - revA;
        return (a.distance ?? 9999) - (b.distance ?? 9999);
      }
      if (sortBy === "reviews") {
        const revA = a.reviewCount ?? 0;
        const revB = b.reviewCount ?? 0;
        if (revB !== revA) return revB - revA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "combo") {
        const aCombo =
          a.menu?.some((f) => f.isCombo) ||
          a.featuredFoods?.some((f) => f.toLowerCase().includes("combo"))
            ? 1
            : 0;
        const bCombo =
          b.menu?.some((f) => f.isCombo) ||
          b.featuredFoods?.some((f) => f.toLowerCase().includes("combo"))
            ? 1
            : 0;
        if (aCombo !== bCombo) return bCombo - aCombo;
        return (a.distance ?? 9999) - (b.distance ?? 9999);
      }
      return 0;
    });

    return sorted;
  }, [
    merchants,
    onlyOpenNow,
    selectedRestaurantType,
    selectedPriceRange,
    selectedCuisineTab,
    sortBy,
  ]);

  const merchantCountText = useMemo(() => {
    if (loading) return "Đang tìm...";

    return `${displayedMerchants.length} địa điểm`;
  }, [displayedMerchants.length, loading]);

  const loadMerchants = useCallback(
    async (
      searchKeyword: string,
      coordsToUse: Coords,
      categoryIdToUse?: string,
      priceRangeToUse?: string,
      radiusKmToUse?: number,
    ) => {
      setLoading(true);

      try {
        const data = await getNearbyMerchants({
          latitude: coordsToUse.latitude,
          longitude: coordsToUse.longitude,
          keyword: searchKeyword,
          categoryId: categoryIdToUse || undefined,
          priceRange: priceRangeToUse || undefined,
          radiusKm: radiusKmToUse ?? selectedRadiusKm,
        });

        setMerchants(data);
        setSelectedMerchantId((prev) =>
          prev && data.some((merchant: Merchant) => merchant.id === prev)
            ? prev
            : null,
        );
      } catch (error) {
        console.error(error);
        notify.error("Không tải được danh sách quán.");
      } finally {
        setLoading(false);
      }
    },
    [selectedRadiusKm],
  );

  const applyCustomerOrigin = useCallback(
    async (
      nextCoords: Coords,
      source: LocationMode,
      accuracy?: number | null,
    ) => {
      setCoords(nextCoords);
      setHasCustomerLocation(source !== "default");
      setLocationMode(source);
      setLocationAccuracy(
        typeof accuracy === "number" ? Math.round(accuracy) : null,
      );
      await loadMerchants(
        keyword,
        nextCoords,
        selectedCategoryId,
        selectedPriceRange,
        selectedRadiusKm,
      );
    },
    [keyword, loadMerchants, selectedCategoryId, selectedPriceRange, selectedRadiusKm],
  );

  const isInitialKeywordMount = useRef(true);
  useEffect(() => {
    if (isInitialKeywordMount.current) {
      isInitialKeywordMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void loadMerchants(
        keyword,
        coords,
        selectedCategoryId,
        selectedPriceRange,
        selectedRadiusKm,
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, coords, loadMerchants, selectedCategoryId, selectedPriceRange, selectedRadiusKm]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const options = await getDiscoveryOptions();
        if (active) {
          setDiscoveryOptions(options);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadCategories();

    const loadWishlist = async () => {
      const user = getCurrentUser();
      if (!user) return;
      try {
        const items = await getWishlist();
        if (active) {
          const ids = new Set(
            items
              .map((item) => item.merchantId || item.id)
              .filter(Boolean) as string[],
          );
          setWishlistIds(ids);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadWishlist();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const text = originInput.trim();
    let active = true;

    const timeoutId = setTimeout(async () => {
      if (text.length < 3 || text === appliedOriginInput.trim()) {
        setOriginSuggestions([]);
        setOriginSuggestionsOpen(false);
        setOriginSuggesting(false);
        return;
      }

      setOriginSuggesting(true);

      try {
        const results = await searchOriginSuggestions(text, coords, 6);

        if (!active) return;

        setOriginSuggestions(results);
        setOriginSuggestionsOpen(true);
      } catch (error) {
        console.error(error);

        if (active) {
          setOriginSuggestions([]);
          setOriginSuggestionsOpen(true);
        }
      } finally {
        if (active) {
          setOriginSuggesting(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [appliedOriginInput, coords, originInput]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const result = await resolveLocation();
      if (cancelled) return;

      setOriginInput("");
      setAppliedOriginInput("");
      setOriginSuggestions([]);
      setOriginSuggestionsOpen(false);
      setCoords(result.coords);
      setHasCustomerLocation(!result.usedDefault);
      setLocationMode(result.usedDefault ? "default" : "browser");
      setLocationAccuracy(
        typeof result.accuracy === "number"
          ? Math.round(result.accuracy)
          : null,
      );

      if (result.usedDefault) {
        setLocationError(getLocationErrorMessage(result));
      } else if (result.accuracy && result.accuracy > 150) {
        setLocationError(
          `Vị trí hiện tại chưa thật chính xác (~${Math.round(
            result.accuracy,
          )}m). Nếu thấy sai, hãy bật GPS/Location Services rồi tải lại trang.`,
        );
      } else {
        setLocationError("");
      }

      try {
        const addr = await reverseGeocode(
          result.coords.latitude,
          result.coords.longitude,
        );
        if (!cancelled && addr?.address) setLocationAddress(addr.address);
      } catch {
        // ignore
      }

      await loadMerchants("", result.coords, undefined, undefined, 15);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadMerchants]);

  useEffect(() => {
    let cancelled = false;

    async function calculateRoute() {
      if (!selectedMerchantId || !selectedMerchant) {
        clearRoute();
        setRouteLoadingMerchantId(null);
        return;
      }

      clearRoute();
      setRouteLoadingMerchantId(selectedMerchant.id);

      if (!hasCustomerLocation) {
        setRouteLoadingMerchantId(null);
        notify.error(
          "Hãy bật quyền vị trí để tính đường đi từ chỗ bạn đang đứng.",
        );
        return;
      }

      let merchantCoords = getMerchantCoords(selectedMerchant);

      if (!merchantCoords && selectedMerchant.address?.trim()) {
        try {
          const results = await searchGeocodeAddress(selectedMerchant.address, {
            proximity: { lat: coords.latitude, lng: coords.longitude },
            size: 5,
          });
          const candidates = results
            .map((item) => ({ lat: item.lat, lng: item.lng }))
            .filter(
              (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
            );
          const candidate =
            candidates.find((item) =>
              isGeocodedDistanceReasonable(
                {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                },
                selectedMerchant,
                item,
              ),
            ) ?? candidates[0];

          if (candidate) {
            merchantCoords = candidate;
          }
        } catch (error) {
          console.error(error);
        }
      }

      if (cancelled) return;

      if (!merchantCoords) {
        clearRoute();
        setRouteLoadingMerchantId(null);
        notify.error("Quán này chưa có tọa độ chính xác để vẽ đường đi.");
        return;
      }

      const result = await route(
        { lng: coords.longitude, lat: coords.latitude },
        { lng: merchantCoords.lng, lat: merchantCoords.lat },
        "motorcycle",
      );

      if (!cancelled && !result) {
        notify.error("Không vẽ được đường đi đến quán này.");
      }
      if (!cancelled) {
        setRouteLoadingMerchantId(null);
      }
    }

    void calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    clearRoute,
    coords.latitude,
    coords.longitude,
    hasCustomerLocation,
    route,
    selectedMerchant,
    selectedMerchantId,
  ]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadMerchants(
      keyword,
      coords,
      selectedCategoryId,
      selectedPriceRange,
      selectedRadiusKm,
    );
  }


  function handleServiceModeChange(nextMode: CustomerServiceMode) {
    setServiceMode(nextMode);

    if (nextMode === "dineIn") {
      setShowMap(true);
      setShowMerchantPanel(true);
      setShowRoutePanel(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "map");
          return next;
        },
        { replace: true },
      );
      return;
    }

    setShowMap(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        return next;
      },
      { replace: true },
    );
  }

  async function handleRefreshCustomerLocation() {
    if (!navigator.geolocation) {
      notify.error("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    setLocatingCustomer(true);

    try {
      const result = await resolveLocation();

      if (result.usedDefault) {
        notify.error(getLocationErrorMessage(result));
        return;
      }

      setCandidateLocation({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      });
      setCandidateAccuracy(
        typeof result.accuracy === "number"
          ? Math.round(result.accuracy)
          : null,
      );
      setOriginInput("");
      setAppliedOriginInput("");
      setOriginSuggestions([]);
      setOriginSuggestionsOpen(false);
      setLocationError("");
      try {
        const addr = await reverseGeocode(
          result.coords.latitude,
          result.coords.longitude,
        );
        if (addr?.address) setLocationAddress(addr.address);
      } catch {
        // ignore
      }
      await applyCustomerOrigin(result.coords, "browser", result.accuracy);
      notify.success("Đã định vị thành công vị trí của bạn!");
    } finally {
      setLocatingCustomer(false);
    }
  }

  const handleLocationPicked = async (
    targetCoords: Coords,
    addressName?: string,
  ) => {
    setShowMapPicker(false);
    if (addressName) {
      setLocationAddress(addressName);
    } else {
      try {
        const addr = await reverseGeocode(
          targetCoords.latitude,
          targetCoords.longitude,
        );
        if (addr?.address) setLocationAddress(addr.address);
      } catch {
        // ignore
      }
    }
    setCoords(targetCoords);
    setHasCustomerLocation(true);
    setLocationMode("manual");
    setLocationError("");
    await loadMerchants(keyword, targetCoords, selectedCategoryId, selectedPriceRange, 15);
    notify.success("Đã cập nhật vị trí mới từ bản đồ!");
  };

  function handleCandidateDrag(lat: number, lng: number) {
    setCandidateLocation({ latitude: lat, longitude: lng });
    setCandidateAccuracy(null);
  }

  function handleSelectMerchantId(id: string) {
    setSelectedMerchantId((prev) => (prev === id ? null : id));

    const el = document.getElementById(`merchant-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleClearRoute() {
    setSelectedMerchantId(null);
    clearRoute();
  }

  function handleOpenMyOrders() {
    navigate("/customer/orders");
  }

  function handleOpenWishlist() {
    navigate("/customer/wishlist");
  }

  function renderServiceModeTabs(className?: string) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 backdrop-blur-md shadow-inner",
          className,
        )}
        aria-label="Chọn chế độ khám phá"
      >
        <button
          type="button"
          onClick={() => handleServiceModeChange("delivery")}
          aria-pressed={serviceMode === "delivery"}
          className={cn(
            "flex h-12 items-center justify-center gap-2.5 rounded-xl px-4 text-sm font-black transition-all duration-300",
            serviceMode === "delivery"
              ? "bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800 hover:text-cyan-800 dark:hover:text-cyan-400",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              serviceMode === "delivery"
                ? "bg-white/20 text-white"
                : "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400",
            )}
          >
            <List className="h-4 w-4" />
          </span>
          Danh sách quán
        </button>
        <button
          type="button"
          onClick={() => handleServiceModeChange("dineIn")}
          aria-pressed={serviceMode === "dineIn"}
          className={cn(
            "flex h-12 items-center justify-center gap-2.5 rounded-xl px-4 text-sm font-black transition-all duration-300",
            serviceMode === "dineIn"
              ? "bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 scale-[1.01]"
              : "text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-400",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              serviceMode === "dineIn"
                ? "bg-white/20 text-white"
                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
            )}
          >
            <MapIcon className="h-4 w-4" />
          </span>
          Radar Bản đồ
        </button>
      </div>
    );
  }

  function renderRouteButton(merchant: Merchant) {
    const selected = selectedMerchantId === merchant.id;
    const calculating =
      routeLoadingMerchantId === merchant.id &&
      selectedMerchantId === merchant.id;

    return (
      <Button
        type="button"
        size="sm"
        variant={selected ? "default" : "outline"}
        className="h-10 w-full justify-center gap-2 rounded-xl text-xs font-black transition duration-200"
        onClick={() => {
          setShowRoutePanel(true);
          handleSelectMerchantId(merchant.id);
        }}
        disabled={calculating}
        aria-pressed={selected}
      >
        {calculating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
        ) : selected ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Navigation className="h-3.5 w-3.5 text-cyan-600" />
        )}
        {calculating
          ? "Đang tính quãng đường..."
          : selected
            ? "Bỏ xem đường đi"
            : "Xem lộ trình trên bản đồ"}
      </Button>
    );
  }

  function renderLocationBar() {
    return (
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-3 backdrop-blur-md shadow-xs">
        <div className="flex min-w-0 items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
          <MapPin className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span
            className="truncate max-w-[260px] sm:max-w-md"
            title={locationAddress || "Vị trí của bạn"}
          >
            {locationAddress || "Đang xác định vị trí của bạn..."}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefreshCustomerLocation}
            disabled={locatingCustomer}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition shadow-2xs"
          >
            {locatingCustomer ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
            ) : (
              <Navigation className="h-3.5 w-3.5 text-cyan-500" />
            )}
            Vị trí của tôi
          </button>
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/50 px-3 text-xs font-black text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition shadow-xs"
          >
            <MapIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            Chọn trên bản đồ
          </button>
        </div>
      </div>
    );
  }

  function renderFilterBar(className = "") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
        {/* Toggle Đang mở cửa */}
        <button
          type="button"
          onClick={() => setOnlyOpenNow((prev) => !prev)}
          className={`h-10 rounded-xl px-3.5 text-xs font-black transition flex items-center gap-2 shrink-0 ${
            onlyOpenNow
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30"
              : "border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400"
          }`}
          title="Chỉ hiển thị các quán đang mở cửa phục vụ"
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              onlyOpenNow ? "bg-white" : "bg-emerald-500 animate-pulse",
            )}
          />
          Đang mở cửa
        </button>

        {/* Dropdown Loại hình quán */}
        <div className="relative min-w-[170px] flex-1 sm:flex-none">
          <select
            value={selectedRestaurantType}
            onChange={(e) => setSelectedRestaurantType(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-cyan-400 focus:border-cyan-500 focus:outline-none transition shadow-2xs cursor-pointer"
          >
            <option value="">Tất cả loại hình quán</option>
            {discoveryOptions.restaurantTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Dropdown Mức giá */}
        <div className="relative min-w-[190px] flex-1 sm:flex-none">
          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 pr-8 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-cyan-400 focus:border-cyan-500 focus:outline-none transition shadow-2xs cursor-pointer"
          >
            <option value="">Tất cả mức giá</option>
            {discoveryOptions.priceRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Dropdown Sắp xếp theo */}
        <div className="relative min-w-[170px] flex-1 sm:flex-none">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 w-full appearance-none rounded-xl border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-950/40 px-3.5 pr-8 text-xs font-black text-cyan-900 dark:text-cyan-200 hover:border-cyan-500 focus:border-cyan-500 focus:outline-none transition shadow-2xs cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600 dark:text-cyan-400" />
        </div>

        {(selectedRestaurantType ||
          selectedPriceRange ||
          onlyOpenNow ||
          selectedCuisineTab !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSelectedRestaurantType("");
              setSelectedPriceRange("");
              setOnlyOpenNow(false);
              setSelectedCuisineTab("all");
              setSelectedCategoryId("");
            }}
            className="h-10 rounded-xl px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
          >
            Đặt lại lọc
          </button>
        )}
      </div>
    );
  }

  function renderCuisineTabs() {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
            <Utensils className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Khám phá theo món
          </h2>
          {selectedCuisineTab !== "all" && (
            <button
              onClick={() => setSelectedCuisineTab("all")}
              className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Xem tất cả món
            </button>
          )}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {CUISINE_QUICK_TABS.map((tab) => {
            const isActive = selectedCuisineTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCuisineTab(tab.id);
                  if (tab.id === "all") {
                    setSelectedCategoryId("");
                  }
                }}
                className={`h-11 shrink-0 rounded-2xl px-4 text-xs sm:text-sm font-black transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? tab.isCombo
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 scale-[1.02]"
                      : "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md scale-[1.02]"
                    : tab.isCombo
                      ? "border border-amber-400/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:border-amber-500"
                      : "border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-cyan-400"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMerchantListContent(
    withRouteActions: boolean,
    compact = false,
  ) {
    if (loading) {
      return <MerchantCardSkeleton count={compact ? 4 : 6} compact={compact} />;
    }

    if (displayedMerchants.length === 0) {
      return (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400 shadow-md backdrop-blur-md transition-colors">
          <Utensils className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-base font-black text-slate-900 dark:text-white">
            Không tìm thấy quán phù hợp
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn khoảng giá khác.
          </p>
        </div>
      );
    }

    return (
      <div
        className={
          compact ? "space-y-3" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {displayedMerchants.map((merchant) => {
          const selected = selectedMerchantId === merchant.id;

          return (
            <div
              key={merchant.id}
              id={`merchant-${merchant.id}`}
              className={cn(
                "scroll-mt-4 rounded-3xl transition-all duration-300",
                selected ? "ring-2 ring-cyan-500 shadow-xl" : "",
              )}
            >
              <MerchantCard
                merchant={merchant}
                selected={selected}
                orderMode="offline"
                backTo={
                  serviceMode === "dineIn"
                    ? "/customer?tab=map"
                    : "/customer"
                }
                compact={compact}
                isWishlisted={wishlistIds.has(merchant.id)}
                onWishlistToggle={(nextSaved) => {
                  setWishlistIds((prev) => {
                    const next = new Set(prev);
                    if (nextSaved) next.add(merchant.id);
                    else next.delete(merchant.id);
                    return next;
                  });
                }}
              />

              {withRouteActions && (
                <div className="px-1 pt-2">{renderRouteButton(merchant)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const mapCanvas = (
    <NearbyMerchantsMap
      center={candidateLocation ?? coords}
      merchants={merchants}
      selectedMerchantId={selectedMerchantId}
      onSelectMerchantId={(id) => {
        setShowRoutePanel(true);
        handleSelectMerchantId(id);
      }}
      routeCoordinates={routeResult?.coordinates}
      onLocateCustomer={handleRefreshCustomerLocation}
      locateLoading={locatingCustomer}
      editableUserMarker={!!candidateLocation}
      onUserMarkerDrag={handleCandidateDrag}
    />
  );

  if (showMap) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        <div className="absolute inset-0">{mapCanvas}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-52 bg-linear-to-b from-white/90 dark:from-slate-950/90 via-white/60 dark:via-slate-950/60 to-transparent" />

        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-start justify-between gap-4 p-4 lg:p-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleServiceModeChange("delivery")}
            aria-label="Xem dạng danh sách quán"
            className="pointer-events-auto h-11 gap-2 rounded-xl border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 px-3 text-slate-800 dark:text-slate-100 font-black shadow-xs backdrop-blur-lg hover:bg-white dark:hover:bg-slate-800"
          >
            <List className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Danh sách quán</span>
          </Button>
          <div className="pointer-events-auto ml-auto flex max-w-full flex-wrap items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMerchantPanel((value) => !value)}
              aria-pressed={showMerchantPanel}
              className="h-11 gap-2 rounded-xl border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 font-black shadow-xs backdrop-blur-lg hover:bg-white dark:hover:bg-slate-800"
            >
              <List className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              {showMerchantPanel ? "Ẩn quán" : "Hiện quán"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRoutePanel((value) => !value)}
              aria-pressed={showRoutePanel}
              className="h-11 gap-2 rounded-xl border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 font-black shadow-xs backdrop-blur-lg hover:bg-white dark:hover:bg-slate-800"
            >
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {showRoutePanel ? "Ẩn chỉ đường" : "Hiện chỉ đường"}
            </Button>
            <UserAccountMenu fallbackName="Customer" />
          </div>
        </header>

        {showMerchantPanel && (
          <aside className="pointer-events-auto absolute bottom-4 left-4 top-4 z-20 flex w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/90 shadow-2xl backdrop-blur-2xl transition-all duration-300">
            <div className="shrink-0 border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <Link to="/customer" className="flex items-center gap-2">
                  <BrandLogo className="h-8 w-auto" />
                </Link>
                <div className="flex items-center gap-2">
                  <span className="flex items-center rounded-full bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 px-3 py-1 text-xs font-black tracking-wide text-cyan-800 dark:text-cyan-300 shadow-2xs">
                    {merchantCountText}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenMyOrders}
                    className="h-7 gap-1 rounded-xl border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950 px-2.5 text-[11px] font-black text-cyan-800 dark:text-cyan-300 shadow-2xs hover:bg-cyan-100 dark:hover:bg-cyan-900"
                  >
                    <ShoppingBag className="h-3 w-3" /> Đơn hàng
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSearch} className="mt-4 relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600 dark:text-cyan-400 pointer-events-none" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm quán, món ăn..."
                  className="h-11 w-full rounded-xl border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/80 pl-10 pr-9 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs focus:border-cyan-600"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword("");
                      void loadMerchants("", coords, selectedCategoryId, selectedPriceRange, selectedRadiusKm);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                    title="Xóa tìm kiếm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {renderServiceModeTabs("mt-3")}
              {renderFilterBar("mt-3")}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
              {renderMerchantListContent(true, true)}
            </div>
            <div className="shrink-0 px-4 pb-4"><SidebarToggle collapsed={false} onToggle={() => setShowMerchantPanel(false)} /></div>
          </aside>
        )}

        {showRoutePanel && (
          <section className="pointer-events-auto absolute right-4 top-20 z-20 flex max-h-[calc(100vh-6rem)] w-[min(480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/90 shadow-2xl backdrop-blur-2xl transition-all duration-300">
            <div className="border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">
                    Lộ trình & Chỉ đường
                  </h2>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedMerchant ? (
                      <span className="text-cyan-700 dark:text-cyan-400">
                        Đang hướng tới: {selectedMerchant.name}
                      </span>
                    ) : (
                      "Chọn quán bất kỳ để nhận đường đi chính xác"
                    )}
                  </p>
                </div>

                {selectedMerchantId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearRoute}
                    className="h-8 gap-1 rounded-xl px-3 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <X className="h-3.5 w-3.5" /> Bỏ chọn
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin] space-y-4">
              {routeResult && (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200/90 dark:border-cyan-800 px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-sm font-black text-cyan-900 dark:text-cyan-200">
                    <Route className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    {metersToKm(routeResult.distance)}
                  </div>
                  <div className="h-4 w-px bg-cyan-200 dark:bg-cyan-800" />
                  <div className="flex items-center gap-1.5 text-sm font-black text-cyan-900 dark:text-cyan-200">
                    <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    {secondsToText(routeResult.duration)}
                  </div>
                </div>
              )}

              {selectedMerchant && (
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 p-4 shadow-2xs">
                  <div>
                    <h3 className="font-black text-slate-950 dark:text-white text-base">
                      {selectedMerchant.name}
                    </h3>
                    {selectedMerchant.address ? (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <MapPin className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                        {selectedMerchant.address}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/customer/merchants/${selectedMerchant.id}?mode=dinein&backTo=${encodeURIComponent("/customer?tab=map")}`,
                        )
                      }
                      className="h-10 flex-1 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <Utensils className="h-3.5 w-3.5 text-amber-500" /> Xem
                      Menu quán
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/customer/merchants/${selectedMerchant.id}?mode=takeaway&backTo=${encodeURIComponent("/customer?tab=map")}`,
                        )
                      }
                      className="h-10 flex-1 gap-1.5 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 px-3 text-xs font-black text-white shadow-xs hover:from-cyan-500 hover:to-blue-500 transition"
                    >
                      <Store className="h-3.5 w-3.5" /> Đặt món trước (Ghé lấy)
                    </Button>
                  </div>
                </div>
              )}

              {routeResult?.steps && routeResult.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />{" "}
                    Hướng dẫn di chuyển ({routeResult.steps.length} bước)
                  </h4>
                  <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 p-3 shadow-2xs">
                    {routeResult.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-[11px] font-extrabold">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                            {step.instruction || "Đi tiếp theo đường"}
                          </p>
                          {step.distance > 0 && (
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              {metersToKm(step.distance)} •{" "}
                              {secondsToText(step.duration)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs transition-colors duration-300">
        <div className="mx-auto flex h-20 max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/customer" className="flex items-center gap-3 shrink-0">
            <BrandLogo className="h-9 sm:h-10 w-auto shrink-0 transition-transform hover:scale-105" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenWishlist}
              aria-label="Mở danh sách quán yêu thích"
              className="h-10 sm:h-11 gap-1.5 sm:gap-2 rounded-xl border-rose-200 dark:border-rose-400/30 bg-white dark:bg-slate-900 px-2.5 sm:px-4 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 shadow-sm transition hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
            >
              <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              <span className="hidden md:inline">Quán yêu thích</span>
            </Button>
            <Button
              type="button"
              onClick={handleOpenMyOrders}
              className="h-10 sm:h-11 gap-1.5 sm:gap-2 rounded-xl bg-slate-900 dark:bg-cyan-500 px-3 sm:px-5 text-xs sm:text-sm font-black text-white dark:text-slate-950 shadow-md transition hover:bg-slate-800 dark:hover:bg-cyan-400 shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Đơn hàng của tôi</span>
            </Button>
            <UserAccountMenu fallbackName="Customer" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Hero Card */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-white via-cyan-50 to-blue-100 p-6 text-slate-950 shadow-2xl sm:p-10 dark:border-white/10 dark:from-slate-950 dark:via-cyan-950 dark:to-blue-950 dark:text-white">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.3),transparent_50%)]" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-600/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-700 shadow-xs backdrop-blur-md dark:border-cyan-400/30 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> UFind Food Dashboard
            </span>
            <h1 className="editorial-heading mt-4 text-3xl font-black leading-tight sm:text-5xl">
              Hôm nay bạn muốn{" "}
              <span className="bg-gradient-to-r from-cyan-600 to-teal-500 bg-clip-text text-transparent dark:from-cyan-300 dark:to-teal-200">
                thưởng thức món gì?
              </span>
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-600 sm:text-base dark:text-slate-300">
              Tìm các món ngon chuẩn vị quanh vị trí của bạn với thông tin
              khoảng cách & thời gian di chuyển chính xác.
            </p>

            {renderLocationBar()}
          </div>

          {/* Service Mode Selector */}
          <div className="relative z-10 mt-6">
            {renderServiceModeTabs("max-w-md")}
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="relative z-10 mt-5"
          >
            <div className="relative w-full">
              <Search className="absolute left-4.5 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-600 dark:text-cyan-400 pointer-events-none" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên quán, món ăn hoặc khu vực gần bạn…"
                className="h-14 w-full rounded-2xl bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium pl-13 pr-12 shadow-lg border border-slate-200/80 dark:border-white/10 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 outline-none transition duration-200"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    void loadMerchants("", coords, selectedCategoryId, selectedPriceRange, selectedRadiusKm);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* Filter Bar */}
          <div className="relative z-10 mt-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 p-3.5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xs">
            {renderFilterBar()}
          </div>
        </section>

        {/* Cuisine Quick Tabs */}
        {renderCuisineTabs()}

        {locationError && (
          <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/30 p-4 text-sm font-bold text-amber-900 dark:text-amber-300 shadow-2xs">
            {locationError}
          </div>
        )}

        {/* Results Section */}
        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                UFind Recommended
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Địa điểm quanh bạn
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 px-3.5 py-1 text-xs font-black text-cyan-800 dark:text-cyan-300 shadow-2xs">
                {displayedMerchants.length} quán ăn
              </span>
            </div>
          </div>

          {renderMerchantListContent(false)}
        </section>
      </main>

      <VietMapLocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialCoords={coords}
        initialAddress={locationAddress}
        onConfirm={handleLocationPicked}
      />
    </div>
  );
}
