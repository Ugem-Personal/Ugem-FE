import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Loader2,
  Map,
  MapPin,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import VietMapGL, { type MapMarker } from "@/shared/components/VietMapGL";
import {
  getGeocodePlaceDetails,
  reverseGeocode,
  searchGeocodeAddress,
  type GeocodeResult,
} from "@/shared/services/vietmapService";
import { cleanAddress } from "@/shared/utils/address";

export type RestaurantAddressPickerProps = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  disabled?: boolean;
  onChange: (data: { address: string; latitude?: number; longitude?: number }) => void;
};

const DEFAULT_CENTER = {
  lat: 10.762622,
  lng: 106.660172,
};

export function RestaurantAddressPicker({
  address,
  latitude,
  longitude,
  disabled = false,
  onChange,
}: Readonly<RestaurantAddressPickerProps>) {
  const [inputValue, setInputValue] = useState(address);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync external address changes to input value
  useEffect(() => {
    setInputValue(address);
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onChange({
      address: text,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const seq = ++searchSeqRef.current;

    if (text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const proximity =
          latitude && longitude ? { lat: latitude, lng: longitude } : null;
        const results = await searchGeocodeAddress(text, {
          size: 5,
          proximity,
        });
        if (seq === searchSeqRef.current) {
          setSuggestions(results);
        }
      } catch (err) {
        console.warn("Address search error:", err);
      } finally {
        if (seq === searchSeqRef.current) {
          setSearching(false);
        }
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: GeocodeResult) => {
    setSuggestions([]);
    try {
      let lat = suggestion.lat;
      let lng = suggestion.lng;
      let fullAddress =
        suggestion.display?.trim() || suggestion.address?.trim() || inputValue;

      if (suggestion.ref_id) {
        const details = await getGeocodePlaceDetails(suggestion);
        if (details?.lat && details?.lng) {
          lat = details.lat;
          lng = details.lng;
        }
        if (details?.address) {
          fullAddress = cleanAddress(details.address);
        }
      }

      setInputValue(fullAddress);
      onChange({
        address: fullAddress,
        latitude: lat,
        longitude: lng,
      });
      setStatusMessage("Đã cập nhật vị trí và địa chỉ từ gợi ý VietMap.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.warn("Select suggestion error:", err);
    }
  };

  // Reverse geocode when marker dragged or clicked on map
  const handleLocationPicked = useCallback(
    async (lng: number, lat: number) => {
      setStatusMessage("Đang tra cứu địa chỉ từ vị trí ghim...");
      try {
        const place = await reverseGeocode(lat, lng);
        const resolvedAddress = place?.address
          ? cleanAddress(place.address)
          : inputValue;
        setInputValue(resolvedAddress);
        onChange({
          address: resolvedAddress,
          latitude: lat,
          longitude: lng,
        });
        setStatusMessage("Đã cập nhật vị trí quán từ bản đồ.");
        setTimeout(() => setStatusMessage(null), 4000);
      } catch {
        onChange({
          address: inputValue,
          latitude: lat,
          longitude: lng,
        });
        setStatusMessage("Đã lưu tọa độ vị trí ghim mới.");
        setTimeout(() => setStatusMessage(null), 4000);
      }
    },
    [inputValue, onChange],
  );

  // Use Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setLocating(true);
    setStatusMessage("Đang lấy vị trí GPS hiện tại...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        await handleLocationPicked(lng, lat);
        setMapOpen(true);
      },
      (err) => {
        setLocating(false);
        setStatusMessage(`Không thể lấy vị trí GPS: ${err.message}`);
        setTimeout(() => setStatusMessage(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const hasCoords = Boolean(latitude && longitude);

  const markers = useMemo<MapMarker[]>(() => {
    if (!latitude || !longitude) return [];
    return [
      {
        id: "restaurant-pin",
        lat: latitude,
        lng: longitude,
        title: "Vị trí nhà hàng",
        description: inputValue || "Vị trí đã ghim",
        type: "restaurant",
        draggable: true,
      },
    ];
  }, [inputValue, latitude, longitude]);

  return (
    <div ref={wrapperRef} className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Địa chỉ nhà hàng &amp; Vị trí bản đồ *
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || locating}
            onClick={handleUseCurrentLocation}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition shadow-xs"
            title="Lấy tọa độ GPS từ vị trí hiện tại của thiết bị"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />
            ) : (
              <Crosshair className="h-3.5 w-3.5 text-cyan-500" />
            )}
            <span>GPS hiện tại</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMapOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-xs ${
              mapOpen
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600"
            }`}
          >
            <Map className="h-3.5 w-3.5 text-cyan-500" />
            <span>{mapOpen ? "Đóng bản đồ" : "Chọn trên bản đồ"}</span>
          </button>
        </div>
      </div>

      {/* Address Input with Search Icon */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <MapPin className="h-4 w-4 text-cyan-500" />
        </div>
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Nhập số nhà, tên đường, khu vực hoặc tìm kiếm địa điểm..."
          className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
          ) : inputValue ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setInputValue("");
                setSuggestions([]);
                onChange({ address: "", latitude: undefined, longitude: undefined });
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl">
            {suggestions.map((sug, idx) => (
              <button
                key={sug.ref_id || `${sug.lat}-${sug.lng}-${idx}`}
                type="button"
                onClick={() => void handleSelectSuggestion(sug)}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {sug.name || sug.display}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {sug.address || sug.display}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coordinate & Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {hasCoords ? (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Đã ghim vị trí ({latitude?.toFixed(6)}, {longitude?.toFixed(6)})
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Chưa ghim tọa độ bản đồ. Mở bản đồ để ghim vị trí chính xác.</span>
          </div>
        )}

        {statusMessage && (
          <span className="text-cyan-700 dark:text-cyan-300 font-medium italic animate-pulse">
            {statusMessage}
          </span>
        )}
      </div>

      {/* Interactive Map Box */}
      {mapOpen && (
        <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-cyan-500" />
              Kéo thả ghim hoặc click bất kỳ điểm nào trên bản đồ để chọn vị trí quán:
            </span>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
              VietMap GL
            </span>
          </div>
          <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-white/10 shadow-inner">
            <VietMapGL
              centerLat={latitude ?? DEFAULT_CENTER.lat}
              centerLng={longitude ?? DEFAULT_CENTER.lng}
              zoom={16}
              markers={markers}
              selectedMarkerId="restaurant-pin"
              fitToMarkers={Boolean(markers.length)}
              onUserMarkerDrag={(lng, lat) => void handleLocationPicked(lng, lat)}
              onMapClick={(lng, lat) => void handleLocationPicked(lng, lat)}
              className="h-full w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
