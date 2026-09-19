import { useEffect, useRef, useState, useCallback } from "react";
import * as vietmapgl from "@vietmap/vietmap-gl-js/dist/vietmap-gl";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";
import {
  HAS_VIETMAP_KEY,
  VIETMAP_API_KEY,
  reverseGeocode,
  searchGeocodeAddress,
  type GeocodeResult,
} from "@/shared/services/vietmapService";
import { cleanAddress } from "@/shared/utils/address";
import {
  Compass,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";

interface VietMapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { latitude: number; longitude: number };
  initialAddress?: string;
  onConfirm: (
    coords: { latitude: number; longitude: number },
    address: string,
  ) => void;
}

const DEFAULT_CENTER: [number, number] = [108, 16]; // [lng, lat], central Vietnam
const VIETNAM_BOUNDS = {
  minLat: 8,
  maxLat: 24,
  minLng: 102,
  maxLng: 110,
};

function isValidVietnamCoords(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VIETNAM_BOUNDS.minLat &&
    lat <= VIETNAM_BOUNDS.maxLat &&
    lng >= VIETNAM_BOUNDS.minLng &&
    lng <= VIETNAM_BOUNDS.maxLng
  );
}

function createPinMarkerElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "group relative cursor-grab active:cursor-grabbing";
  el.innerHTML = `
    <div class="flex flex-col items-center">
      <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-xl ring-4 ring-cyan-500/30 transition-transform duration-150 hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
        </svg>
      </div>
      <div class="h-2 w-2 rotate-45 bg-cyan-500 -mt-1 shadow-sm"></div>
    </div>
  `;
  return el;
}

export default function VietMapLocationPickerModal({
  isOpen,
  onClose,
  initialCoords,
  initialAddress = "",
  onConfirm,
}: VietMapLocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<vietmapgl.Map | null>(null);
  const markerRef = useRef<vietmapgl.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  }>(initialCoords);
  const [currentAddress, setCurrentAddress] = useState<string>(initialAddress);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Search autocomplete
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Sync initial coords when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentCoords(initialCoords);
      setCurrentAddress(initialAddress);
      setSearchInput("");
      setSuggestions([]);
    }
  }, [isOpen, initialCoords, initialAddress]);

  // Handle reverse geocoding
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setResolvingAddress(true);
    try {
      const res = await reverseGeocode(lat, lng);
      if (res?.address) {
        setCurrentAddress(cleanAddress(res.address));
      } else {
        setCurrentAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setCurrentAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setResolvingAddress(false);
    }
  }, []);

  // Update marker position and reverse geocode
  const updateLocation = useCallback(
    (lat: number, lng: number, shouldPan = true, shouldFetchAddress = true) => {
      if (!isValidVietnamCoords(lat, lng)) return;

      const nextLat = Number(lat.toFixed(6));
      const nextLng = Number(lng.toFixed(6));
      setCurrentCoords({ latitude: nextLat, longitude: nextLng });

      if (markerRef.current) {
        markerRef.current.setLngLat([nextLng, nextLat]);
      }

      if (shouldPan && mapRef.current) {
        mapRef.current.flyTo({ center: [nextLng, nextLat], zoom: 16, duration: 600 });
      }

      if (shouldFetchAddress) {
        void fetchAddress(nextLat, nextLng);
      }
    },
    [fetchAddress],
  );

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current || !HAS_VIETMAP_KEY) {
      return;
    }

    const startLng = initialCoords.longitude || DEFAULT_CENTER[0];
    const startLat = initialCoords.latitude || DEFAULT_CENTER[1];

    const styleUrl = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`;

    const map = new vietmapgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [startLng, startLat],
      zoom: 15,
      transformRequest: (url) => {
        if (HAS_VIETMAP_KEY && url.includes("vietmap.vn") && !url.includes("apikey=")) {
          const sep = url.includes("?") ? "&" : "?";
          return { url: `${url}${sep}apikey=${VIETMAP_API_KEY}` };
        }
        return { url };
      },
    });

    map.addControl(new vietmapgl.NavigationControl({}), "top-right");

    const marker = new vietmapgl.Marker({
      element: createPinMarkerElement(),
      draggable: true,
      anchor: "bottom",
    })
      .setLngLat([startLng, startLat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      updateLocation(pos.lat, pos.lng, false, true);
    });

    markerRef.current = marker;

    map.on("click", (e) => {
      updateLocation(e.lngLat.lat, e.lngLat.lng, true, true);
    });

    map.on("load", () => {
      map.resize();
      setTimeout(() => map.resize(), 200);
    });

    mapRef.current = map;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [isOpen, initialCoords, updateLocation]);

  // Autocomplete search
  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchGeocodeAddress(q, {
        proximity: { lat: currentCoords.latitude, lng: currentCoords.longitude },
        size: 5,
      })
        .then((items) => {
          if (active) setSuggestions(items.slice(0, 5));
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchInput, currentCoords]);

  // Geolocation button
  function handleLocateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude, true, true);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function chooseSuggestion(s: GeocodeResult) {
    setSearchInput(s.name || s.display);
    setSuggestions([]);
    updateLocation(s.lat, s.lng, true, true);
  }

  function handleConfirm() {
    onConfirm(currentCoords, currentAddress || "Vị trí đã chọn trên bản đồ");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex h-[92vh] max-h-[720px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 id="map-picker-title" className="text-sm font-black text-slate-950 dark:text-white sm:text-base">
                Chọn vị trí trên bản đồ Vietmap
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Click hoặc kéo thả ghim đến vị trí bạn muốn tìm quán quanh đó
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar Overlay */}
        <div className="relative z-20 border-b border-slate-200/60 bg-slate-50/80 px-4 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-800">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm đường, phường, quận hoặc địa điểm..."
                  className="h-full w-full bg-transparent text-xs font-medium text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                />
                {searching ? (
                  <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-cyan-500" />
                ) : null}
              </label>

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 ? (
                <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-800">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.ref_id}-${s.lat}-${s.lng}`}
                      type="button"
                      onClick={() => chooseSuggestion(s)}
                      className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-cyan-50 dark:hover:bg-white/5"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-bold text-slate-900 dark:text-white">
                          {s.name || s.display}
                        </strong>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {cleanAddress(s.display || s.address)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              title="Định vị vị trí của tôi"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-400 transition"
            >
              {locating ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-cyan-500" />
              ) : (
                <Compass className="h-3.5 w-3.5 text-cyan-500" />
              )}
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950">
          <div
            ref={mapContainerRef}
            className="h-full w-full dark:[&_.vietmapgl-canvas]:brightness-90 dark:[&_.vietmapgl-canvas]:contrast-[1.15] dark:[&_.vietmapgl-canvas]:hue-rotate-180 dark:[&_.vietmapgl-canvas]:invert"
          />

          {/* Hint Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl border border-slate-900/10 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              💡 Bấm vào bản đồ hoặc kéo ghim để đổi điểm tìm kiếm
            </p>
          </div>
        </div>

        {/* Footer: Resolved Address & Confirm Button */}
        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 sm:max-w-md">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Địa chỉ đã chọn
              </span>
              <p className="truncate text-xs font-black text-slate-950 dark:text-white" title={currentAddress}>
                {resolvingAddress ? (
                  <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <LoaderCircle className="h-3 w-3 animate-spin" />
                    Đang xác định địa chỉ...
                  </span>
                ) : (
                  currentAddress || "Chưa chọn địa chỉ"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={resolvingAddress || !currentCoords.latitude}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-xs font-black text-slate-950 shadow-md shadow-cyan-500/25 transition hover:bg-cyan-400 active:scale-95 disabled:opacity-50"
            >
              <MapPin className="h-3.5 w-3.5" />
              Áp dụng vị trí này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
