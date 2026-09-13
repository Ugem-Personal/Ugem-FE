import { useEffect, useRef, useState, useCallback } from "react";
import type {
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  Store,
  Phone,
  Mail,
  FileText,
  MapPin,
  Crosshair,
  Sparkles,
  AlertCircle,
  Building2,
  UtensilsCrossed,
} from "lucide-react";
import type { OnboardingFormValues } from "../schema";
import * as vietmapgl from "@vietmap/vietmap-gl-js/dist/vietmap-gl";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";
import {
  type GeocodeResult,
  getGeocodePlaceDetails,
  reverseGeocode as vietmapReverseGeocode,
  searchGeocodeAddress as vietmapSearchGeocodeAddress,
  HAS_VIETMAP_KEY,
  HAS_VIETMAP_SERVICE_KEY,
  VIETMAP_API_KEY,
} from "@/shared/services/vietmapService";
import { cleanAddress } from "@/shared/utils/address";

type Props = Readonly<{
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  watch?: UseFormWatch<OnboardingFormValues>;
  watchedAddress?: string;
  watchedLat?: number | null;
  watchedLng?: number | null;
}>;

export const POPULAR_CUISINES = [
  "Cơm & Món Việt",
  "Bún, Phở, Mì & Hủ tiếu",
  "Trà sữa & Đồ uống",
  "Cà phê & Tiệm bánh",
  "Đồ ăn vặt & Tráng miệng",
  "Lẩu & Đồ nướng",
  "Món Hàn / Nhật / Thái",
  "Món Âu & Pizza / Burger",
  "Ăn chay & Thực dưỡng",
  "Quán ăn gia đình / Nhậu",
];

const DEFAULT_CENTER: [number, number] = [106.660172, 10.762622]; // lng, lat
const VIETNAM_BOUNDS = {
  minLat: 8,
  maxLat: 24,
  minLng: 102,
  maxLng: 110,
};

function getSuggestionAddress(suggestion: GeocodeResult) {
  return cleanAddress(
    suggestion.display?.trim() || suggestion.address?.trim() || "",
  );
}

export function StoreInfoLocationStep({
  register,
  errors,
  setValue,
  watch,
  watchedLat,
  watchedLng,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<vietmapgl.Map | null>(null);
  const markerRef = useRef<vietmapgl.Marker | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const currentRestaurantType = watch ? watch("restaurantType") : "";
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>(
    [],
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeSeqRef = useRef(0);

  const createMarkerElement = useCallback(() => {
    const marker = document.createElement("div");
    marker.style.width = "20px";
    marker.style.height = "20px";
    marker.style.borderRadius = "999px";
    marker.style.background = "#0891b2";
    marker.style.border = "3px solid #ffffff";
    marker.style.boxShadow = "0 0 0 6px rgba(8, 145, 178, 0.25)";
    marker.style.transform = "translateY(-1px)";
    marker.style.position = "relative";
    marker.style.zIndex = "10";
    return marker;
  }, []);

  const isValidNumber = useCallback(
    (value: number | null | undefined): value is number => {
      return typeof value === "number" && Number.isFinite(value);
    },
    [],
  );

  const isValidVietnamCoords = useCallback(
    (lat: number | null | undefined, lng: number | null | undefined) => {
      return (
        isValidNumber(lat) &&
        isValidNumber(lng) &&
        lat >= VIETNAM_BOUNDS.minLat &&
        lat <= VIETNAM_BOUNDS.maxLat &&
        lng >= VIETNAM_BOUNDS.minLng &&
        lng <= VIETNAM_BOUNDS.maxLng
      );
    },
    [isValidNumber],
  );

  const getValidLocationCoords = useCallback(
    (
      lat: number | null | undefined,
      lng: number | null | undefined,
    ): [number, number] | null => {
      if (isValidVietnamCoords(lat, lng)) {
        return [lng as number, lat as number];
      }
      return null;
    },
    [isValidVietnamCoords],
  );

  const commitCoordinates = useCallback(
    (lat: number, lng: number) => {
      setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
      setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const reverseGeocodeCoords = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await vietmapReverseGeocode(lat, lng);
        if (res?.address) {
          setValue("address", cleanAddress(res.address), {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } catch {
        // Reverse geocoding error can be ignored
      }
    },
    [setValue],
  );

  const applyCoordinates = useCallback(
    async (lat: number, lng: number, shouldReverseGeocode = false) => {
      if (!isValidVietnamCoords(lat, lng)) {
        setLocationError("Vị trí nằm ngoài lãnh thổ Việt Nam.");
        return;
      }

      setLocationError("");
      commitCoordinates(lat, lng);

      const map = mapRef.current;
      if (map) {
        if (!markerRef.current) {
          const marker = new vietmapgl.Marker({
            element: createMarkerElement(),
            draggable: true,
          })
            .setLngLat([lng, lat])
            .addTo(map);

          marker.on("dragend", () => {
            const pos = marker.getLngLat();
            void applyCoordinates(
              Number.parseFloat(pos.lat.toFixed(7)),
              Number.parseFloat(pos.lng.toFixed(7)),
              true,
            );
          });
          markerRef.current = marker;
        } else {
          markerRef.current.setLngLat([lng, lat]);
        }
        map.flyTo({ center: [lng, lat], zoom: 16, duration: 600 });
      }

      if (shouldReverseGeocode) {
        await reverseGeocodeCoords(lat, lng);
      }
    },
    [
      commitCoordinates,
      createMarkerElement,
      isValidVietnamCoords,
      reverseGeocodeCoords,
    ],
  );

  const placeMarker = useCallback(
    (map: vietmapgl.Map, coords: [number, number]) => {
      if (markerRef.current) {
        markerRef.current.setLngLat(coords);
        return;
      }
      const marker = new vietmapgl.Marker({
        element: createMarkerElement(),
        draggable: true,
      })
        .setLngLat(coords)
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        void applyCoordinates(
          Number.parseFloat(pos.lat.toFixed(7)),
          Number.parseFloat(pos.lng.toFixed(7)),
          true,
        );
      });
      markerRef.current = marker;
    },
    [applyCoordinates, createMarkerElement],
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !HAS_VIETMAP_KEY) return;

    const validLocationCoords = getValidLocationCoords(watchedLat, watchedLng);
    const initialCenter: [number, number] =
      validLocationCoords ?? DEFAULT_CENTER;

    const styleUrl = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`;

    const map = new vietmapgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: initialCenter,
      zoom: validLocationCoords ? 15 : 12,
      transformRequest: (url) => {
        if (HAS_VIETMAP_KEY && url.includes("vietmap.vn")) {
          if (!url.includes("apikey=")) {
            const separator = url.includes("?") ? "&" : "?";
            return { url: `${url}${separator}apikey=${VIETMAP_API_KEY}` };
          }
        }
        return { url };
      },
    });

    map.addControl(new vietmapgl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      void applyCoordinates(
        Number.parseFloat(lat.toFixed(7)),
        Number.parseFloat(lng.toFixed(7)),
      );
    });

    map.on("load", () => {
      map.resize();
      if (validLocationCoords) {
        placeMarker(map, validLocationCoords);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeMarker]);

  useEffect(() => {
    const map = mapRef.current;
    const validLocationCoords = getValidLocationCoords(watchedLat, watchedLng);
    if (!map || !validLocationCoords) return;
    placeMarker(map, validLocationCoords);
    map.flyTo({ center: validLocationCoords, zoom: 15, duration: 800 });
  }, [watchedLat, watchedLng, placeMarker, getValidLocationCoords]);

  const geocodeAddress = useCallback(
    async (address: string) => {
      const query = address.trim();
      if (query.length < 3) return;

      if (!HAS_VIETMAP_SERVICE_KEY) {
        setGeocodeSuggestions([]);
        setGeocoding(false);
        return;
      }

      const seq = ++geocodeSeqRef.current;
      setGeocoding(true);
      try {
        const map = mapRef.current;
        const validLocationCoords = getValidLocationCoords(
          watchedLat,
          watchedLng,
        );
        const proximity = (() => {
          if (validLocationCoords) {
            return { lat: validLocationCoords[1], lng: validLocationCoords[0] };
          }
          const center = map?.getCenter();
          if (center) {
            return { lat: center.lat, lng: center.lng };
          }
          return undefined;
        })();

        const results = await vietmapSearchGeocodeAddress(query, {
          proximity: proximity ?? null,
          size: 8,
        });

        if (seq !== geocodeSeqRef.current) return;
        setGeocodeSuggestions(results.slice(0, 6));
      } catch {
        if (seq === geocodeSeqRef.current) {
          setGeocodeSuggestions([]);
        }
      } finally {
        if (seq === geocodeSeqRef.current) {
          setGeocoding(false);
        }
      }
    },
    [getValidLocationCoords, watchedLat, watchedLng],
  );

  const handlePickSuggestion = useCallback(
    async (suggestion: GeocodeResult) => {
      setGeocodeSuggestions([]);
      const displayAddress = getSuggestionAddress(suggestion);
      setValue("address", displayAddress, {
        shouldDirty: true,
        shouldValidate: true,
      });

      let lat = suggestion.lat;
      let lng = suggestion.lng;

      if (suggestion.ref_id) {
        try {
          const detail = await getGeocodePlaceDetails(suggestion);
          if (detail) {
            lat = detail.lat;
            lng = detail.lng;
          }
        } catch {
          // ignore error
        }
      }

      if (!isValidVietnamCoords(lat, lng)) {
        setLocationError("Không lấy được toạ độ hợp lệ từ địa chỉ này.");
        return;
      }

      commitCoordinates(lat, lng);
    },
    [commitCoordinates, isValidVietnamCoords, setValue],
  );

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    register("address").onChange(e);
    const val = e.target.value;
    setGeocodeSuggestions([]);
    setLocationError("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => geocodeAddress(val), 800);
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        void applyCoordinates(latitude, longitude, true);
      },
      (err) => {
        setLocating(false);
        setLocationError("Không thể lấy vị trí hiện tại: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const hasCoords = isValidVietnamCoords(watchedLat, watchedLng);

  return (
    <section className="onboarding-card space-y-6">
      <div>
        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
          <Building2 className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wider">Bước 1/3</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
          Thông tin &amp; Vị trí quán
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Nhập các thông tin cơ bản và ghim chính xác vị trí trên bản đồ để thực khách dễ dàng tìm thấy bạn.
        </p>
      </div>

      {/* Basic Store Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Store className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Tên quán / Nhà hàng <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Cà Phê Mộc, Bún Chả Hà Nội Xưa"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            {...register("restaurantName")}
          />
          {errors.restaurantName && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.restaurantName.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Số điện thoại quán <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="tel"
            placeholder="0912 345 678"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Email liên hệ quán <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="email"
            placeholder="quan@example.com"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.email.message}
            </p>
          )}
        </div>

        {/* Loại hình ẩm thực / Danh mục chính */}
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Loại hình ẩm thực / Danh mục chính <span className="text-rose-500">*</span></span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Bấm chọn nhanh hoặc tự nhập
            </span>
          </label>

          {/* Quick select buttons */}
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_CUISINES.map((cuisine) => {
              const isSelected = currentRestaurantType === cuisine;
              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => {
                    setValue("restaurantType", cuisine, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-cyan-50 dark:bg-cyan-950/70 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500/30 scale-[1.02]"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-800 hover:bg-cyan-50/20"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <input
              type="text"
              placeholder="Hoặc tự nhập loại hình khác (Ví dụ: Bánh mì pate, Chè Huế...)"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              {...register("restaurantType")}
            />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Mô tả ngắn về quán <span className="text-xs text-slate-400 font-normal">(Tùy chọn)</span></span>
          </label>
          <textarea
            rows={2}
            placeholder="Giới thiệu đôi nét về không gian, đặc trưng hương vị hoặc thông điệp của quán..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
            {...register("description")}
          />
        </div>
      </div>

      {/* Address & VietMap Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Địa chỉ chi tiết &amp; Ghim vị trí bản đồ <span className="text-rose-500">*</span></span>
          </label>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
          >
            <Crosshair className={`h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Đang định vị..." : "Lấy vị trí hiện tại"}
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            {...register("address")}
            onChange={handleAddressChange}
          />
          {geocoding && (
            <span className="absolute right-3 top-2.5 text-xs text-cyan-600 animate-pulse font-medium">
              Đang tìm kiếm...
            </span>
          )}

          {/* Autocomplete suggestions */}
          {geocodeSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
              {geocodeSuggestions.map((item) => (
                <button
                  key={`${item.lat}-${item.lng}-${item.display}`}
                  type="button"
                  onClick={() => void handlePickSuggestion(item)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-50/50 dark:hover:bg-white/5 transition flex items-start gap-2 text-xs"
                >
                  <MapPin className="h-3.5 w-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {getSuggestionAddress(item)}
                    </p>
                    <p className="text-slate-400 truncate text-[11px]">
                      {cleanAddress(item.address)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {errors.address && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {errors.address.message}
          </p>
        )}

        {locationError && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {locationError}
          </p>
        )}

        {/* VietMap Interactive Map */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner relative">
          <div ref={mapContainer} className="h-64 w-full bg-slate-100 dark:bg-slate-900" />

          {/* Floating map hint */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-xl bg-slate-950/70 backdrop-blur-md px-3 py-1.5 text-[11px] text-white">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Click hoặc kéo thả ghim đỏ để điều chỉnh vị trí quán
            </span>
            {hasCoords && (
              <span className="font-mono text-cyan-300 font-bold hidden sm:inline">
                ({Number(watchedLat).toFixed(4)}, {Number(watchedLng).toFixed(4)})
              </span>
            )}
          </div>
        </div>

        {(errors.latitude || errors.longitude) && !hasCoords && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Vui lòng chọn vị trí quán trên bản đồ
          </p>
        )}
      </div>
    </section>
  );
}
