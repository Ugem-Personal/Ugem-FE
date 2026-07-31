import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/shared/lib/notify";

import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/shared/components";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { getCategories } from "@/shared/services/categoryService";
import type { Category } from "@/shared/types";

import MerchantCard from "../components/MerchantCard";
import NearbyMerchantsMap from "../components/NearbyMerchantsMap.tsx";
import { getNearbyMerchants } from "../services/merchantService";
import type { Merchant } from "../types";
import { useVietMapRoute } from "@/shared/hooks/useVietMapRoute";
import {
  type GeocodeResult,
  metersToKm,
  secondsToText,
  searchGeocodeAddress,
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
type PriceRangeFilter = "Tiết kiệm" | "Bình dân" | "Tầm trung";

const PRICE_RANGE_FILTERS: PriceRangeFilter[] = [
  "Tiết kiệm",
  "Bình dân",
  "Tầm trung",
];

const DEFAULT_COORDS: Coords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

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

      // Accept position even if accuracy is poor - just mark it as inaccurate
      console.debug(
        "[resolveLocation] Accepted position (even if not ideal):",
        `lat=${bestPosition.coords.latitude.toFixed(6)}, lng=${bestPosition.coords.longitude.toFixed(6)}, accuracy=${Math.round(bestPosition.coords.accuracy)}m`,
      );

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

    // Debug log
    console.debug(
      "[resolveLocation] Started watching position with timeout:",
      LOCATION_SAMPLE_TIMEOUT_MS,
      "ms",
    );
  });
}

/** Lấy tọa độ của merchant */
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

function normalizePriceRange(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  return (
    PRICE_RANGE_FILTERS.find((label) => label.toLowerCase() === normalized) ||
    ""
  );
}

function getMerchantPriceRange(merchant: Merchant) {
  const directPriceRange = normalizePriceRange(
    (merchant as Merchant & { priceRange?: string }).priceRange,
  );

  if (directPriceRange) return directPriceRange;

  const lines = (merchant.description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const priceRangeLine = lines.find((line) =>
    line.toLowerCase().startsWith("khoảng giá trung bình:"),
  );

  if (!priceRangeLine) return "";

  const value = priceRangeLine.split(":").slice(1).join(":").trim();

  return normalizePriceRange(value);
}

function getMerchantCuisineLabel(merchant: Merchant) {
  const lines = (merchant.description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cuisineLine = lines.find((line) =>
    line.toLowerCase().startsWith("loại món chính:"),
  );

  if (cuisineLine) {
    return cuisineLine.split(":").slice(1).join(":").trim();
  }

  const menuCategories = merchant.menu
    ?.flatMap((item) => item.categoryDetail ?? [])
    .filter(Boolean)
    .slice(0, 3);

  return menuCategories?.length ? menuCategories.join(", ") : "Chưa cập nhật";
}

function formatRating(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Chưa có";

  return value.toFixed(2);
}

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<
    PriceRangeFilter | ""
  >("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [hasCustomerLocation, setHasCustomerLocation] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("default");
  const [originInput, setOriginInput] = useState("");
  const [appliedOriginInput, setAppliedOriginInput] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeResult[]>(
    [],
  );
  const [originSuggestionsOpen, setOriginSuggestionsOpen] = useState(false);
  const [originSuggesting, setOriginSuggesting] = useState(false);
  const [originResolving, setOriginResolving] = useState(false);
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeResult[]>(
    [],
  );
  const [locatingCustomer, setLocatingCustomer] = useState(false);
  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS);
  // Candidate location (from geolocation) pending user confirmation
  const [candidateLocation, setCandidateLocation] = useState<Coords | null>(
    null,
  );
  const [candidateAccuracy, setCandidateAccuracy] = useState<number | null>(
    null,
  );
  const [serviceMode, setServiceMode] =
    useState<CustomerServiceMode>("delivery");
  const [showMap, setShowMap] = useState(false);
  const [showMerchantPanel, setShowMerchantPanel] = useState(true);
  const [showRoutePanel, setShowRoutePanel] = useState(true);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null,
  );
  const [routeLoadingMerchantId, setRouteLoadingMerchantId] = useState<
    string | null
  >(null);
  const [routeDestinationCoords, setRouteDestinationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Route state ──────────────────────────────────────────────
  const { route, clearRoute, routeResult } = useVietMapRoute();

  const selectedMerchant = useMemo(
    () =>
      merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null,
    [merchants, selectedMerchantId],
  );
  const selectedMerchantCoords = useMemo(
    () => (selectedMerchant ? getMerchantCoords(selectedMerchant) : null),
    [selectedMerchant],
  );
  const visibleDestinationCoords =
    selectedMerchantCoords ?? routeDestinationCoords;

  const displayedMerchants = useMemo(() => {
    if (!selectedPriceRange) return merchants;

    return merchants.filter(
      (merchant) => getMerchantPriceRange(merchant) === selectedPriceRange,
    );
  }, [merchants, selectedPriceRange]);

  const merchantCountText = useMemo(() => {
    if (loading) return "Đang tải";

    return `${displayedMerchants.length} quán`;
  }, [displayedMerchants.length, loading]);
  const hasMapSearch = keyword.trim().length > 0;

  const loadMerchants = useCallback(
    async (
      searchKeyword: string,
      coordsToUse: Coords,
      categoryIdToUse?: string,
    ) => {
      setLoading(true);

      try {
        const data = await getNearbyMerchants({
          latitude: coordsToUse.latitude,
          longitude: coordsToUse.longitude,
          keyword: searchKeyword,
          categoryId: categoryIdToUse || undefined,
        });

        setMerchants(data);
        setSelectedMerchantId((prev) =>
          prev && data.some((merchant) => merchant.id === prev) ? prev : null,
        );
      } catch (error) {
        console.error(error);
        notify.error("Không tải được danh sách quán.");
      } finally {
        setLoading(false);
      }
    },
    [],
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
      await loadMerchants(keyword, nextCoords, selectedCategoryId);
    },
    [keyword, loadMerchants, selectedCategoryId],
  );

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const data = await getCategories();
        if (active) setCategories(data ?? []);
      } catch (error) {
        console.error(error);
      }
    };

    void loadCategories();

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

      await loadMerchants("", result.coords);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadMerchants]);

  // ── Tự động tính route khi chọn quán ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function calculateRoute() {
      if (!selectedMerchantId || !selectedMerchant) {
        clearRoute();
        setRouteDestinationCoords(null);
        setRouteLoadingMerchantId(null);
        return;
      }

      clearRoute();
      setRouteDestinationCoords(null);
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
        setRouteDestinationCoords(null);
        setRouteLoadingMerchantId(null);
        notify.error("Quán này chưa có tọa độ chính xác để vẽ đường đi.");
        return;
      }

      setRouteDestinationCoords(merchantCoords);
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
    loadMerchants(keyword, coords, selectedCategoryId);
  }

  function handleCategoryChange(nextCategoryId: string) {
    setSelectedCategoryId(nextCategoryId);
    void loadMerchants(keyword, coords, nextCategoryId);
  }

  function handleServiceModeChange(nextMode: CustomerServiceMode) {
    setServiceMode(nextMode);

    if (nextMode === "dineIn") {
      setShowMap(true);
      setShowMerchantPanel(true);
      setShowRoutePanel(true);
      return;
    }

    setShowMap(false);
  }

  async function handleRefreshCustomerLocation() {
    console.debug("[handleRefreshCustomerLocation] START");

    if (!navigator.geolocation) {
      console.error("[handleRefreshCustomerLocation] ❌ No geolocation API");
      notify.error("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    console.debug("[handleRefreshCustomerLocation] Geolocation API available");
    setLocatingCustomer(true);

    try {
      console.debug(
        "[handleRefreshCustomerLocation] Calling resolveLocation()...",
      );
      const result = await resolveLocation();
      console.debug(
        "[handleRefreshCustomerLocation] resolveLocation completed:",
        {
          usedDefault: result.usedDefault,
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.accuracy,
        },
      );

      if (result.usedDefault) {
        notify.error(getLocationErrorMessage(result));
        return;
      }

      // Instead of applying immediately, set as candidate for user confirmation
      console.debug(
        "[handleRefreshCustomerLocation] ✅ Got location, setting candidate for confirmation...",
      );
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
      await applyCustomerOrigin(result.coords, "browser", result.accuracy);
    } finally {
      console.debug(
        "[handleRefreshCustomerLocation] END (locatingCustomer = false)",
      );
      setLocatingCustomer(false);
    }
  }

  async function applyOriginSuggestion(suggestion: GeocodeResult) {
    const label = suggestion.display || suggestion.address || suggestion.name;

    setOriginInput(label);
    setAppliedOriginInput(label);
    setOriginSuggestions([]);
    setOriginSuggestionsOpen(false);
    setOriginResolving(true);

    try {
      setLocationError("");
      await applyCustomerOrigin(
        {
          latitude: suggestion.lat,
          longitude: suggestion.lng,
        },
        "manual",
        null,
      );
      setCandidateLocation(null);
      setCandidateAccuracy(null);
      setGeocodeCandidates([]);
      notify.success("Đã đặt vị trí xuất phát.");
    } finally {
      setOriginResolving(false);
    }
  }

  async function handleSelectGeocodeCandidate(candidate: GeocodeResult) {
    setGeocodeCandidates([]);
    await applyOriginSuggestion(candidate);
  }

  async function handleOriginSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = originInput.trim();
    if (!text) return;

    setOriginResolving(true);
    try {
      const results = await searchOriginSuggestions(text, coords, 5);
      const first = results[0];
      if (!first) {
        notify.error("Không tìm được vị trí bạn nhập.");
        return;
      }

      setOriginInput(first.display || first.address || first.name);
      setAppliedOriginInput(first.display || first.address || first.name);
      setOriginSuggestions([]);
      setOriginSuggestionsOpen(false);
      setLocationError("");
      await applyCustomerOrigin(
        { latitude: first.lat, longitude: first.lng },
        "manual",
        null,
      );
      setGeocodeCandidates([]);
      setCandidateLocation(null);
      setCandidateAccuracy(null);
      notify.success("Đã đặt vị trí xuất phát.");
    } catch (e) {
      console.error(e);
      notify.error("Không thể đặt vị trí từ gợi ý");
    } finally {
      setOriginResolving(false);
    }
  }

  async function handleConfirmCandidate() {
    if (!candidateLocation) return;
    setLocatingCustomer(true);
    try {
      await applyCustomerOrigin(
        candidateLocation,
        "browser",
        candidateAccuracy ?? null,
      );
      setCandidateLocation(null);
      setCandidateAccuracy(null);
      setLocationError("");
      notify.success("Đã xác nhận vị trí của bạn.");
    } catch (e) {
      console.error(e);
      notify.error("Không thể xác nhận vị trí.");
    } finally {
      setLocatingCustomer(false);
    }
  }

  function handleCancelCandidate() {
    setCandidateLocation(null);
    setCandidateAccuracy(null);
    setLocationError("⚠️ Vui lòng nhập địa chỉ của bạn để tìm quán gần nhất.");
  }

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
    setRouteDestinationCoords(null);
    clearRoute();
  }

  function handleOpenMyOrders() {
    navigate("/customer/orders");
  }

  function renderServiceModeTabs(className?: string) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-xl border border-white/40 bg-white/40 p-1.5 shadow-[inset_0_2px_10px_rgba(255,255,255,0.7)] backdrop-blur-md",
          className,
        )}
        aria-label="Chọn kiểu sử dụng dịch vụ"
      >
        <button
          type="button"
          onClick={() => handleServiceModeChange("delivery")}
          aria-pressed={serviceMode === "delivery"}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all duration-300 ease-out",
            serviceMode === "delivery"
              ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-900/20 ring-1 ring-white/20 scale-[1.02]"
              : "text-slate-600 hover:bg-white/60 hover:text-cyan-800",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              serviceMode === "delivery" ? "bg-white/20 text-cyan-50" : "bg-cyan-50 text-cyan-600",
            )}
          >
            <Navigation className="h-4 w-4" />
          </span>
          Giao hàng
        </button>
        <button
          type="button"
          onClick={() => handleServiceModeChange("dineIn")}
          aria-pressed={serviceMode === "dineIn"}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all duration-300 ease-out",
            serviceMode === "dineIn"
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-900/20 ring-1 ring-white/20 scale-[1.02]"
              : "text-slate-600 hover:bg-white/60 hover:text-amber-700",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              serviceMode === "dineIn" ? "bg-white/20 text-amber-50" : "bg-amber-50 text-amber-600",
            )}
          >
            <MapIcon className="h-4 w-4" />
          </span>
          Tại quán
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
        className="h-9 w-full justify-center gap-2 rounded-lg text-xs"
        onClick={() => {
          setShowRoutePanel(true);
          handleSelectMerchantId(merchant.id);
        }}
        disabled={calculating}
        aria-pressed={selected}
      >
        {calculating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : selected ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Navigation className="h-3.5 w-3.5" />
        )}
        {calculating ? "Đang tính..." : selected ? "Bỏ chọn" : "Xem đường đi"}
      </Button>
    );
  }

  function renderCategoryFilter(className = "") {
    if (categories.length === 0) return null;

    return (
      <select
        value={selectedCategoryId}
        onChange={(event) => handleCategoryChange(event.target.value)}
        className={cn(
          "h-11 rounded-xl border border-white/60 bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur outline-none transition-all focus:border-cyan-400 focus:bg-white/90 focus:ring-4 focus:ring-cyan-400/10",
          className,
        )}
      >
        <option value="">Tất cả danh mục</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    );
  }

  function renderPriceRangeFilters(className = "") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button
          type="button"
          size="sm"
          variant={selectedPriceRange === "" ? "default" : "outline"}
          onClick={() => setSelectedPriceRange("")}
          className="h-9 rounded-full px-4 text-xs font-semibold"
        >
          Tất cả
        </Button>

        {PRICE_RANGE_FILTERS.map((label) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={selectedPriceRange === label ? "default" : "outline"}
            onClick={() => setSelectedPriceRange(label)}
            className="h-9 rounded-full px-4 text-xs font-semibold"
          >
            {label}
          </Button>
        ))}
      </div>
    );
  }

  function renderMerchantListContent(withRouteActions: boolean, compact = false) {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-200 bg-cyan-50/80 px-4 py-8 text-sm font-medium text-cyan-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải quán gần bạn...
        </div>
      );
    }

    if (displayedMerchants.length === 0) {
      if (merchants.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            Chưa có quán nào gần bạn.
          </div>
        );
      }

      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
          Không có quán nào phù hợp với bộ lọc hiện tại.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {displayedMerchants.map((merchant) => {
          const selected = selectedMerchantId === merchant.id;

          return (
            <div
              key={merchant.id}
              id={`merchant-${merchant.id}`}
              className={cn(
                "scroll-mt-4 rounded-lg transition-all",
                selected ? "bg-cyan-50/70 p-1" : "",
              )}
            >
              <MerchantCard
                merchant={merchant}
                selected={selected}
                orderMode={serviceMode === "dineIn" ? "offline" : "online"}
                compact={compact}
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
      <div className="fixed inset-0 overflow-hidden bg-slate-100 text-slate-900">
        <div className="absolute inset-0">{mapCanvas}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-52 bg-linear-to-b from-white/90 via-white/60 to-transparent" />
        {showMerchantPanel && hasMapSearch && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-130 max-w-full bg-linear-to-r from-white/75 via-white/35 to-transparent" />
        )}

        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex flex-wrap items-start justify-between gap-4 px-4 py-4 lg:px-6">
          {showMerchantPanel && (
            <div className="pointer-events-auto w-full max-w-96 rounded-2xl border border-white/50 bg-white/60 p-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl transition-all duration-500">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-xl font-black tracking-tight text-transparent">
                    UGem
                  </h1>
                  <p className="text-xs font-medium text-slate-500">
                    Khám phá tinh hoa ẩm thực
                  </p>
                </div>
                <span className="flex items-center rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 px-3 py-1 text-xs font-bold tracking-wide text-cyan-800 shadow-sm ring-1 ring-cyan-500/10">
                  {merchantCountText}
                </span>
              </div>

              <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm quán, món ăn..."
                  className="h-10 rounded-xl border-white/60 bg-white/60 px-4 text-sm font-medium shadow-sm backdrop-blur transition-all focus:border-cyan-400 focus:bg-white/90 focus:ring-4 focus:ring-cyan-400/10"
                />
                <Button
                  type="submit"
                  className="h-10 shrink-0 gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 font-bold shadow-md shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95"
                  disabled={loading}
                >
                  <Search className="h-4 w-4" />
                  Tìm
                </Button>
              </form>

              {renderServiceModeTabs("mt-3")}
              {renderCategoryFilter("mt-3 h-10 w-full")}
              {renderPriceRangeFilters("mt-3")}
            </div>
          )}

          <div className="pointer-events-auto ml-auto flex max-w-full flex-wrap items-center justify-end gap-2.5">
            <UserAccountMenu fallbackName="Customer" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMerchantPanel((value) => !value)}
              aria-pressed={showMerchantPanel}
              className="h-10 gap-2 rounded-xl border-white/50 bg-white/70 font-semibold shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] backdrop-blur-lg transition-all hover:bg-white/90"
            >
              <List className="h-4 w-4 text-cyan-600" />
              {showMerchantPanel ? "Ẩn quán" : "Hiện quán"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRoutePanel((value) => !value)}
              aria-pressed={showRoutePanel}
              className="h-10 gap-2 rounded-xl border-white/50 bg-white/70 font-semibold shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] backdrop-blur-lg transition-all hover:bg-white/90"
            >
              <MapPin className="h-4 w-4 text-emerald-600" />
              {showRoutePanel ? "Ẩn vị trí" : "Hiện vị trí"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleServiceModeChange("delivery")}
              aria-pressed={serviceMode === "delivery"}
              className="h-10 gap-2 rounded-xl border-white/50 bg-white/70 font-semibold shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] backdrop-blur-lg transition-all hover:bg-white/90"
            >
              <Navigation className="h-4 w-4 text-blue-600" />
              Giao hàng
            </Button>
          </div>
        </header>

        {showMerchantPanel && hasMapSearch && (
          <aside className="pointer-events-auto absolute bottom-4 left-4 top-50 z-20 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl transition-all duration-500 lg:bottom-6 lg:left-6 lg:top-50">
            <div className="border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-800">Kết quả tìm kiếm</h2>
                  <p className="text-xs font-medium text-slate-500">
                    Chọn quán để xem đường đi trên bản đồ
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenMyOrders}
                    className="h-8 rounded-xl border-cyan-200/60 bg-white/80 px-3 text-xs font-bold text-cyan-700 shadow-sm transition-colors hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    Đơn của tôi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowMerchantPanel(false)}
                    className="h-8 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                  >
                    Ẩn
                  </Button>
                </div>
              </div>

              {locationError && (
                <div className="mt-3 rounded-xl border border-orange-200/80 bg-gradient-to-r from-orange-50/90 to-red-50/90 px-4 py-2.5 text-[13px] font-semibold text-orange-800 shadow-sm">
                  {locationError}
                </div>
              )}

              {renderPriceRangeFilters("mt-3")}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
              {renderMerchantListContent(true, true)}
            </div>
          </aside>
        )}

        {showRoutePanel && (
          <section className="pointer-events-auto absolute right-4 top-56 z-20 flex max-h-[calc(100vh-10rem)] w-[min(470px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl transition-all duration-500 lg:right-6 lg:top-56">
            <div className="border-b border-white/40 bg-white/40 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Bản đồ di chuyển</h2>
                  <p className="text-[13px] font-medium text-slate-500">
                    {selectedMerchant
                      ? <span className="text-cyan-700">Đang xem: {selectedMerchant.name}</span>
                      : "Click vào quán để xem đường đi"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {selectedMerchantId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleClearRoute}
                      className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      Xoá
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRoutePanel(false)}
                    className="h-8 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                  >
                    Ẩn
                  </Button>
                </div>
              </div>

              <form
                onSubmit={handleOriginSubmit}
                className="mt-3 flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Input
                    value={originInput}
                    onChange={(e) => {
                      setOriginInput(e.target.value);
                      setAppliedOriginInput("");
                      setOriginSuggestionsOpen(true);
                    }}
                    placeholder="Nhập vị trí của bạn, VD: BS10B Vinhomes Grand Park"
                    onFocus={() => {
                      if (originInput.trim().length >= 3) {
                        setOriginSuggestionsOpen(true);
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(
                        () => setOriginSuggestionsOpen(false),
                        120,
                      );
                    }}
                    className="h-9 rounded-lg bg-white/90 text-xs"
                    autoComplete="off"
                  />
                  {originSuggestionsOpen && originInput.trim().length >= 3 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-cyan-100 bg-white py-1 text-sm shadow-xl">
                      {originSuggesting ? (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Đang tìm gợi ý...
                        </div>
                      ) : originSuggestions.length > 0 ? (
                        originSuggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.ref_id}-${suggestion.lat}-${suggestion.lng}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                              void applyOriginSuggestion(suggestion)
                            }
                            className="block w-full px-3 py-2 text-left hover:bg-cyan-50"
                          >
                            <span className="block truncate font-medium text-slate-800">
                              {suggestion.name || suggestion.display}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {suggestion.address || suggestion.display}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Không có gợi ý phù hợp.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={originResolving || !originInput.trim()}
                    className="h-9 whitespace-nowrap rounded-lg text-xs"
                  >
                    {originResolving ? "Đang tìm..." : "Đặt vị trí"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCustomerLocation}
                    disabled={locatingCustomer}
                    className="h-9 gap-1.5 whitespace-nowrap rounded-lg bg-white/80 text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {locatingCustomer ? "Đang lấy..." : "Hiện tại"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
              {geocodeCandidates.length > 0 && (
                <div className="rounded-lg border border-cyan-100 bg-white/95 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Gợi ý địa điểm
                      </h3>
                      <p className="text-xs text-slate-500">
                        Chọn vị trí đúng nhất với ý bạn
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setGeocodeCandidates([])}
                      className="h-8 rounded-lg text-xs"
                    >
                      Đóng
                    </Button>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {geocodeCandidates.map((c) => {
                      const distM = Math.round(
                        distanceKm(
                          {
                            latitude:
                              candidateLocation?.latitude ?? coords.latitude,
                            longitude:
                              candidateLocation?.longitude ?? coords.longitude,
                          },
                          { lat: c.lat, lng: c.lng },
                        ) * 1000,
                      );

                      return (
                        <li
                          key={c.ref_id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {c.display || c.name}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {c.address} • ~{distM}m
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSelectGeocodeCandidate(c)}
                            className="h-8 rounded-lg text-xs"
                          >
                            Chọn
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {candidateLocation && (
                <div className="mt-3 rounded-lg border border-cyan-100 bg-white/95 p-3 text-sm shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">Vị trí đề xuất</div>
                      <div className="text-xs text-slate-500">
                        {candidateLocation.latitude.toFixed(6)},{" "}
                        {candidateLocation.longitude.toFixed(6)}{" "}
                        {candidateAccuracy ? `(±${candidateAccuracy}m)` : ""}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Kéo chấm trên bản đồ để điều chỉnh vị trí, sau đó bấm
                        "Xác nhận vị trí".
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmCandidate}
                        className="h-9 rounded-lg text-xs"
                      >
                        Xác nhận
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelCandidate}
                        className="h-9 rounded-lg text-xs"
                      >
                        Huỷ
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {routeResult && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-cyan-50 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-700">
                    <Route className="h-4 w-4" />
                    {metersToKm(routeResult.distance)}
                  </div>
                  <div className="h-4 w-px bg-cyan-200" />
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-700">
                    <Clock className="h-4 w-4" />
                    {secondsToText(routeResult.duration)}
                  </div>
                </div>
              )}

              {selectedMerchant && (
                <div className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/80 px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                        Chi tiết quán
                      </div>
                      <h3 className="mt-1 truncate text-base font-black text-slate-950">
                        {selectedMerchant.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
                      Review {formatRating(selectedMerchant.rating)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div className="rounded-md bg-white/90 px-3 py-2 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Tên quán
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {selectedMerchant.name}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/90 px-3 py-2 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Review
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatRating(selectedMerchant.rating)}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/90 px-3 py-2 shadow-sm sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Loại quán đồ
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {getMerchantCuisineLabel(selectedMerchant)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {routeResult && (routeResult.steps?.length ?? 0) > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-white/95 px-4 py-3 text-sm shadow-sm [scrollbar-width:thin]">
                  <div className="mb-2 font-semibold text-slate-800">
                    Hướng dẫn đường đi
                  </div>

                  <ol className="space-y-2">
                    {routeResult.steps!.map((step, index) => (
                      <li
                        key={`${step.instruction}-${index}`}
                        className="flex gap-2"
                      >
                        <span className="font-semibold text-cyan-600">
                          {index + 1}.
                        </span>
                        <span>
                          {step.instruction}
                          <span className="ml-1 text-xs text-slate-500">
                            ({metersToKm(step.distance)})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-3 grid gap-1 wrap-break-word rounded-lg bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>
                  Bạn:{" "}
                  {hasCustomerLocation
                    ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}${
                        locationAccuracy !== null
                          ? ` (±${locationAccuracy}m)`
                          : ""
                      }${locationMode === "manual" ? " (nhập tay)" : ""}`
                    : "chưa lấy được vị trí hiện tại"}
                </span>
                {selectedMerchant && (
                  <span>
                    Quán:{" "}
                    {visibleDestinationCoords
                      ? `${visibleDestinationCoords.lat.toFixed(6)}, ${visibleDestinationCoords.lng.toFixed(6)}${
                          selectedMerchantCoords ? "" : " (geocode)"
                        }`
                      : "chưa có tọa độ từ BE, FE sẽ thử lấy theo địa chỉ"}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edfafa_0%,#f7fbfc_34%,#ffffff_100%)] text-slate-950">
      <header className="border-b border-white/80 bg-white/75 shadow-sm shadow-cyan-950/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-3xl font-black">UGem</h1>
            <p className="text-sm font-medium text-slate-500">
              Khám phá các quán ăn gần bạn
            </p>
          </div>

          <UserAccountMenu fallbackName="Customer" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-5">
        <section className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-xl shadow-cyan-950/10 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Hôm nay ăn gì?
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Tìm món ngon quanh vị trí của bạn
              </p>
            </div>

            <span className="w-fit rounded-md border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-sm font-black text-cyan-800">
              {merchantCountText}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={handleOpenMyOrders}
              className="h-11 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white shadow-md shadow-cyan-950/10 hover:bg-cyan-700"
            >
              Đơn hàng của tôi
            </Button>
          </div>

          {renderServiceModeTabs("mt-4")}
          {renderCategoryFilter("mt-4 w-full sm:w-72")}
          {renderPriceRangeFilters("mt-4")}

          <form
            onSubmit={handleSearch}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm quán, món ăn..."
              className="h-12 rounded-lg border-slate-200 bg-white text-sm shadow-sm"
            />
            <Button
              type="submit"
              className="h-12 gap-2 rounded-lg px-6 shadow-md shadow-cyan-950/10"
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              Tìm
            </Button>
          </form>
        </section>

        {locationError && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 shadow-sm">
            {locationError}
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Quán gần bạn</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {merchantCountText} quanh vị trí hiện tại
              </p>
            </div>

            <span className="rounded-md border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase text-amber-700">
              Giao nhanh
            </span>
          </div>

          {renderMerchantListContent(false)}
        </section>
      </main>
    </div>
  );
}
