import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, Map, MapPin, Search } from "lucide-react";

import VietMapGL, { type MapMarker } from "@/shared/components/VietMapGL";
import {
  getGeocodePlaceDetails,
  reverseGeocode,
  searchGeocodeAddress,
  type GeocodeResult,
} from "@/shared/services/vietmapService";
import { hasStreetLevelAddress } from "@/shared/utils/address";

export type DeliveryLocation = {
  address: string;
  latitude?: number;
  longitude?: number;
};

const GOOD_LOCATION_ACCURACY_METERS = 60;
const MAX_ACCEPTED_LOCATION_ACCURACY_METERS = 150;
const LOCATION_SAMPLE_TIMEOUT_MS = 12_000;

type DeliveryLocationPickerProps = {
  value: DeliveryLocation;
  error?: string;
  proximity?: { lat: number; lng: number } | null;
  onChange: (value: DeliveryLocation) => void;
};

export function DeliveryLocationPicker({
  value,
  error,
  proximity,
  onChange,
}: DeliveryLocationPickerProps) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequenceRef = useRef(0);
  const locateWatchRef = useRef<number | null>(null);
  const locateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const clearLocationWatch = useCallback(() => {
    if (locateWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locateWatchRef.current);
      locateWatchRef.current = null;
    }
    if (locateTimeoutRef.current) {
      clearTimeout(locateTimeoutRef.current);
      locateTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearLocationWatch, [clearLocationWatch]);

  function searchAddress(query: string) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const sequence = ++searchSequenceRef.current;

    if (query.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const proximityToUse =
          proximity ||
          (value.latitude && value.longitude
            ? { lat: value.latitude, lng: value.longitude }
            : null);

        const results = await searchGeocodeAddress(query, {
          size: 6,
          proximity: proximityToUse,
        });
        if (sequence === searchSequenceRef.current) {
          setSuggestions(results);
          setStatusMessage(
            results.length === 0 ? "Không tìm thấy địa chỉ phù hợp." : "",
          );
        }
      } catch (searchError) {
        console.error(searchError);
        if (sequence === searchSequenceRef.current) {
          setSuggestions([]);
          setStatusMessage("Không thể tải gợi ý địa chỉ. Vui lòng thử lại.");
        }
      } finally {
        if (sequence === searchSequenceRef.current) setSearching(false);
      }
    }, 350);
  }

  async function selectSuggestion(suggestion: GeocodeResult) {
    setSearching(true);
    try {
      const place = await getGeocodePlaceDetails(suggestion);
      onChange({
        address: place.display || place.address || place.name,
        latitude: place.lat,
        longitude: place.lng,
      });
      setSuggestions([]);
      setStatusMessage(
        hasStreetLevelAddress(place.display || place.address || place.name)
          ? "Đã xác định tên đường và vị trí giao hàng."
          : "Đã ghim vị trí. Hãy nhập thêm số nhà hoặc tên đường rồi chọn một gợi ý chi tiết.",
      );
      setMapOpen(true);
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatusMessage("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    clearLocationWatch();
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;

    const applyBestPosition = async (position: GeolocationPosition) => {
      const accuracy = Math.round(position.coords.accuracy);
      const latitude = Number(position.coords.latitude.toFixed(7));
      const longitude = Number(position.coords.longitude.toFixed(7));

      if (accuracy > MAX_ACCEPTED_LOCATION_ACCURACY_METERS) {
        setStatusMessage(
          `Vị trí chưa đủ chính xác (~${accuracy}m). Hãy bật GPS, tắt VPN hoặc thử trên điện thoại.`,
        );
        return;
      }

      try {
        const result = await reverseGeocode(latitude, longitude);
        onChange({
          address:
            result?.address ||
            `Vị trí đã chọn (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
          latitude,
          longitude,
        });
        setSuggestions([]);
        setMapOpen(true);
        setStatusMessage(
          result?.address && hasStreetLevelAddress(result.address)
            ? `Đã xác định tên đường từ mẫu GPS tốt nhất (độ chính xác ~${accuracy}m).`
            : `GPS đang lệch khoảng ${accuracy}m nên VietMap mới xác định được khu vực. Hãy nhập số nhà, tên đường và chọn một gợi ý chi tiết.`,
        );
      } catch (locationError) {
        console.error(locationError);
        onChange({
          address: `Vị trí đã chọn (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
          latitude,
          longitude,
        });
        setMapOpen(true);
        setStatusMessage(
          `Đã lấy tọa độ chính xác ~${accuracy}m nhưng chưa đọc được tên địa chỉ.`,
        );
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      clearLocationWatch();
      setLocating(false);

      if (!bestPosition) {
        setStatusMessage(
          "Không lấy được vị trí. Hãy kiểm tra quyền truy cập GPS hoặc chọn địa chỉ gợi ý.",
        );
        return;
      }

      void applyBestPosition(bestPosition);
    };

    setLocating(true);
    setStatusMessage("Đang lấy nhiều mẫu GPS để chọn vị trí chính xác nhất...");

    locateWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
          setStatusMessage(
            `Đang cải thiện độ chính xác GPS: ~${Math.round(position.coords.accuracy)}m...`,
          );
        }

        if (position.coords.accuracy <= GOOD_LOCATION_ACCURACY_METERS) {
          finish();
        }
      },
      (locationError) => {
        if (bestPosition) {
          finish();
          return;
        }

        clearLocationWatch();
        setLocating(false);
        setStatusMessage(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Bạn cần cho phép trình duyệt truy cập vị trí hiện tại."
            : "Không lấy được vị trí. Hãy bật GPS rồi thử lại hoặc chọn địa chỉ gợi ý.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_SAMPLE_TIMEOUT_MS,
        maximumAge: 0,
      },
    );

    locateTimeoutRef.current = setTimeout(finish, LOCATION_SAMPLE_TIMEOUT_MS);
  }

  async function handleMarkerDrag(longitude: number, latitude: number) {
    onChange({ ...value, latitude, longitude });
    setStatusMessage("Đang cập nhật địa chỉ theo vị trí ghim...");

    try {
      const result = await reverseGeocode(latitude, longitude);
      onChange({
        address: result?.address || value.address,
        latitude,
        longitude,
      });
      setStatusMessage("Đã cập nhật vị trí giao hàng.");
    } catch (reverseError) {
      console.error(reverseError);
      setStatusMessage("Đã lưu vị trí ghim; chưa cập nhật được tên địa chỉ.");
    }
  }

  const hasCoordinates =
    Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const hasStreetAddress = hasStreetLevelAddress(value.address);
  const markers: MapMarker[] = hasCoordinates
    ? [
        {
          id: "delivery-location",
          lat: value.latitude as number,
          lng: value.longitude as number,
          type: "custom",
          color: "#0891b2",
          draggable: true,
          popupHtml:
            '<div style="font-weight:700;font-size:13px;padding:2px 4px">Điểm giao hàng</div>',
        },
      ]
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="delivery-address"
          className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200"
        >
          <MapPin className="h-4 w-4 text-cyan-600" /> Địa chỉ giao hàng *
        </label>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          Vị trí hiện tại
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
        <input
          id="delivery-address"
          value={value.address}
          onChange={(event) => {
            const address = event.target.value;
            onChange({ address });
            setMapOpen(false);
            setStatusMessage("");
            searchAddress(address);
          }}
          placeholder="Tìm số nhà, tên đường hoặc địa điểm..."
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950"
        />
        {searching ? (
          <Loader2 className="absolute right-4 top-4 h-4 w-4 animate-spin text-cyan-600" />
        ) : null}

        {suggestions.length > 0 ? (
          <div
            role="listbox"
            className="absolute inset-x-0 top-14 z-70 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.ref_id}-${suggestion.lat}-${suggestion.lng}`}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => void selectSuggestion(suggestion)}
                className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 dark:text-white">
                    {suggestion.name || suggestion.display}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    {suggestion.address || suggestion.display}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {hasCoordinates ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
            hasStreetAddress
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
          }`}
        >
          <span
            className={`text-xs font-bold ${
              hasStreetAddress
                ? "text-emerald-800 dark:text-emerald-300"
                : "text-amber-800 dark:text-amber-300"
            }`}
          >
            {hasStreetAddress
              ? "Đã xác định tên đường và tọa độ giao hàng"
              : "Chưa xác định được tên đường — hãy chọn địa chỉ gợi ý"}
          </span>
          <button
            type="button"
            onClick={() => setMapOpen((current) => !current)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-black ${
              hasStreetAddress
                ? "text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                : "text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/15"
            }`}
          >
            <Map className="h-4 w-4" />
            {mapOpen ? "Ẩn bản đồ" : "Chỉnh trên bản đồ"}
          </button>
        </div>
      ) : null}

      {mapOpen && hasCoordinates ? (
        <div className="h-56 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <VietMapGL
            centerLat={value.latitude}
            centerLng={value.longitude}
            zoom={17}
            markers={markers}
            selectedMarkerId="delivery-location"
            fitToMarkers
            onUserMarkerDrag={(longitude, latitude) =>
              void handleMarkerDrag(longitude, latitude)
            }
            className="h-full w-full"
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-xs font-bold text-rose-600" role="alert">
          {error}
        </p>
      ) : statusMessage ? (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400" role="status">
          {statusMessage}
        </p>
      ) : (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Chọn một gợi ý hoặc dùng GPS để người giao hàng nhận đúng vị trí.
        </p>
      )}
    </div>
  );
}
