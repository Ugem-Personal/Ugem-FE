import { useEffect, useRef, useState, useCallback } from "react";
import type {
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
} from "react-hook-form";
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
import { cleanAddress, isDetailedAddress } from "@/shared/utils/address";

type Props = Readonly<{
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  watchedAddress?: string;
  watchedLat?: number | null;
  watchedLng?: number | null;
}>;

const DEFAULT_CENTER: [number, number] = [106.660172, 10.762622]; // lng, lat
const VIETNAM_BOUNDS = {
  minLat: 8,
  maxLat: 24,
  minLng: 102,
  maxLng: 110,
};
const GOOD_LOCATION_ACCURACY_METERS = 60;
const MAX_ACCEPTED_LOCATION_ACCURACY_METERS = 150;
const LOCATION_SAMPLE_TIMEOUT_MS = 12_000;

function getSuggestionAddress(suggestion: GeocodeResult) {
  return cleanAddress(
    suggestion.display?.trim() || suggestion.address?.trim() || "",
  );
}

export function AddressLocationStep({
  register,
  errors,
  setValue,
  watchedAddress,
  watchedLat,
  watchedLng,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<vietmapgl.Map | null>(null);
  const markerRef = useRef<vietmapgl.Marker | null>(null);
  const locateWatchRef = useRef<number | null>(null);
  const locateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState("");
  const [addressDetailStatus, setAddressDetailStatus] = useState<
    "idle" | "detailed" | "coarse"
  >("idle");
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>(
    [],
  );
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "ok" | "error">(
    "idle",
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeSeqRef = useRef(0);

  const createMarkerElement = useCallback(() => {
    const marker = document.createElement("div");
    marker.style.width = "18px";
    marker.style.height = "18px";
    marker.style.borderRadius = "999px";
    marker.style.background = "#e84f25";
    marker.style.border = "3px solid #ffffff";
    marker.style.boxShadow = "0 0 0 6px rgba(232, 79, 37, 0.18)";
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
    (lat?: number | null, lng?: number | null): [number, number] | null => {
      if (!isValidVietnamCoords(lat, lng)) return null;
      return [Number(lng), Number(lat)];
    },
    [isValidVietnamCoords],
  );

  const placeMarker = useCallback(
    (map: vietmapgl.Map, coords: [number, number]) => {
      const [lng, lat] = coords;
      if (!isValidNumber(lat) || !isValidNumber(lng)) {
        console.warn("placeMarker: invalid coords", coords);
        return;
      }

      if (markerRef.current) {
        markerRef.current.setLngLat(coords);
      } else {
        markerRef.current = new vietmapgl.Marker({
          element: createMarkerElement(),
          anchor: "bottom",
        })
          .setLngLat(coords)
          .addTo(map);
      }
    },
    [createMarkerElement, isValidNumber],
  );

  const syncMapToCoords = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current;
      if (!map) return;

      placeMarker(map, [lng, lat]);
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    },
    [placeMarker],
  );

  const commitCoordinates = useCallback(
    (lat: number, lng: number) => {
      if (!isValidVietnamCoords(lat, lng)) {
        console.warn("commitCoordinates: invalid", { lat, lng });
        setGeocodeStatus("error");
        setLocationError(
          "Toạ độ không hợp lệ. Hãy chọn vị trí nằm trong Việt Nam.",
        );
        return;
      }

      setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
      setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
      syncMapToCoords(lat, lng);
      setGeocodeStatus("ok");
      setLocationError("");
    },
    [isValidVietnamCoords, setValue, syncMapToCoords],
  );

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

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      return await vietmapReverseGeocode(lat, lng);
    } catch {
      return null;
    }
  }, []);

  const applyCoordinates = useCallback(
    async (
      lat: number,
      lng: number,
    ) => {
      commitCoordinates(lat, lng);

      if (watchedAddress?.trim()) {
        setAddressDetailStatus(
          isDetailedAddress(watchedAddress) ? "detailed" : "coarse",
        );
        return;
      }

      const result = await reverseGeocode(lat, lng);
      if (result?.address) {
        setValue("address", cleanAddress(result.address), {
          shouldDirty: true,
          shouldValidate: true,
        });
        setAddressDetailStatus(result.isDetailed ? "detailed" : "coarse");
      }
    },
    [commitCoordinates, reverseGeocode, setValue, watchedAddress],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ lấy vị trí hiện tại.");
      setGeocodeStatus("error");
      return;
    }

    clearLocationWatch();
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearLocationWatch();
      setLocating(false);

      if (!bestPosition) {
        setLocationError(
          "Không lấy được vị trí hiện tại. Kiểm tra quyền truy cập vị trí của trình duyệt.",
        );
        setGeocodeStatus("error");
        return;
      }

      const accuracy = bestPosition.coords.accuracy;
      setLocationAccuracy(Math.round(accuracy));

      if (accuracy > MAX_ACCEPTED_LOCATION_ACCURACY_METERS) {
        setLocationError(
          `Vị trí hiện tại chưa đủ chính xác (~${Math.round(
            accuracy,
          )}m). Hãy bật GPS/Location Services, tắt VPN hoặc thử trên điện thoại.`,
        );
        setGeocodeStatus("error");
        return;
      }

      const lat = Number.parseFloat(bestPosition.coords.latitude.toFixed(7));
      const lng = Number.parseFloat(bestPosition.coords.longitude.toFixed(7));

      setLocationError("");
      void applyCoordinates(lat, lng);
    };

    setLocating(true);
    setLocationAccuracy(null);
    setLocationError("");
    setGeocodeStatus("idle");

    locateWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
          setLocationAccuracy(Math.round(position.coords.accuracy));
        }

        if (position.coords.accuracy <= GOOD_LOCATION_ACCURACY_METERS) {
          finish();
        }
      },
      (error) => {
        const hasCandidate = bestPosition !== null;
        if (hasCandidate) {
          finish();
          return;
        }

        clearLocationWatch();
        setGeocodeStatus("error");
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Bạn cần cho phép trình duyệt truy cập vị trí hiện tại."
            : "Không lấy được vị trí hiện tại. Hãy bật GPS/Location Services rồi thử lại.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_SAMPLE_TIMEOUT_MS,
        maximumAge: 0,
      },
    );

    locateTimeoutRef.current = setTimeout(finish, LOCATION_SAMPLE_TIMEOUT_MS);
  }, [applyCoordinates, clearLocationWatch]);

  useEffect(() => {
    return clearLocationWatch;
  }, [clearLocationWatch]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !HAS_VIETMAP_KEY) return;

    const validLocationCoords = getValidLocationCoords(watchedLat, watchedLng);
    const initialCenter: [number, number] =
      validLocationCoords ?? DEFAULT_CENTER;

    // Use 'tm' (topographic) style - better visuals than 'lm'
    const styleUrl = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`;

    const map = new vietmapgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: initialCenter,
      zoom: validLocationCoords ? 15 : 12,
      transformRequest: (url) => {
        // Tự động thêm apikey vào các request gọi đến vietmap.vn
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

    mapRef.current = map;

    if (validLocationCoords) {
      map.on("load", () => placeMarker(map, validLocationCoords));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeMarker]);

  // Sync marker when lat/lng changes externally (e.g. geocoding update)
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
        setGeocodeStatus("error");
        setGeocoding(false);
        return;
      }

      const seq = ++geocodeSeqRef.current;
      setGeocoding(true);
      setGeocodeStatus("idle");
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
          size: 10,
        });

        if (seq !== geocodeSeqRef.current) return;

        setGeocodeSuggestions(results.slice(0, 8));

        if (results.length === 0) {
          setGeocodeStatus("error");
        }
      } catch {
        if (seq === geocodeSeqRef.current) {
          setGeocodeSuggestions([]);
          setGeocodeStatus("error");
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
      setLocationError("");
      setLocationAccuracy(null);
      setGeocoding(true);

      let selectedSuggestion = suggestion;
      try {
        selectedSuggestion = await getGeocodePlaceDetails(suggestion);
      } finally {
        setGeocoding(false);
      }

      const lat = Number(Number(selectedSuggestion.lat).toFixed(7));
      const lng = Number(Number(selectedSuggestion.lng).toFixed(7));
      const selectedAddress = getSuggestionAddress(selectedSuggestion);

      setGeocodeSuggestions([]);
      setValue(
        "address",
        selectedAddress,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
      setAddressDetailStatus(
        isDetailedAddress(selectedAddress) ? "detailed" : "coarse",
      );

      if (!isValidVietnamCoords(lat, lng)) {
        console.warn("handlePickSuggestion: invalid coords", {
          lat,
          lng,
          suggestion,
        });
        setGeocodeStatus("error");
        setLocationError("Không lấy được toạ độ hợp lệ từ địa chỉ này.");
        return;
      }

      commitCoordinates(lat, lng);
    },
    [commitCoordinates, isValidVietnamCoords, setValue],
  );

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    // forward to react-hook-form's register onChange
    register("address").onChange(e);

    const val = e.target.value;
    setAddressDetailStatus("idle");
    setGeocodeSuggestions([]);
    setGeocodeStatus("idle");
    setLocationError("");
    setLocationAccuracy(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => geocodeAddress(val), 900);
  }

  return (
    <section className="onboarding-card">
      <h2>Địa chỉ &amp; vị trí</h2>

      <label>
        <span>Địa chỉ quán *</span>
        <div className="address-search-field">
          <input
            placeholder="Ví dụ: 12 Nguyễn Trãi, Quận 1, TP.HCM"
            {...register("address")}
            onChange={handleAddressChange}
          />
          {geocoding && (
            <span className="address-searching-status">
              ⏳ Đang tìm...
            </span>
          )}
          {!HAS_VIETMAP_SERVICE_KEY && (
            <div className="address-service-warning">
              ⚠ Chưa cấu hình VietMap Service key
            </div>
          )}
          {geocodeSuggestions.length > 0 && (
            <div className="address-suggestions">
              <div className="address-suggestions-heading">
                Chọn một gợi ý bên dưới
              </div>
              {geocodeSuggestions.map((item) => (
                <button
                  key={`${item.lat}-${item.lng}-${item.display}`}
                  type="button"
                  onClick={() => void handlePickSuggestion(item)}
                  className="address-suggestion-button"
                >
                  <div className="address-suggestion-title">
                    {getSuggestionAddress(item)}
                  </div>
                  <div className="address-suggestion-subtitle">
                    {cleanAddress(item.address)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.address && <small>{errors.address.message}</small>}
        {geocodeStatus === "ok" && !geocoding && (
          <small className="address-status address-status-success">
            ✓ Đã xác định được vị trí trên bản đồ
          </small>
        )}
        {geocodeStatus === "error" && !geocoding && (
          <small className="address-status address-status-error">
            ⚠ Không tìm được vị trí, bạn có thể click thẳng trên bản đồ để chọn
          </small>
        )}
        {geocodeStatus === "ok" && !geocoding && (
          <small className="address-status address-status-info">
            📍 Vị trí đã được chọn trên bản đồ
          </small>
        )}
        {addressDetailStatus === "detailed" && !geocoding && (
          <small className="address-status address-status-success">
            Địa chỉ chi tiết đã được VietMap xác định.
          </small>
        )}
        {addressDetailStatus === "coarse" && !geocoding && (
          <small className="address-status address-status-warning" role="status">
            VietMap mới xác định được khu vực. Vui lòng bổ sung số nhà và tên
            đường để hồ sơ chính xác hơn.
          </small>
        )}
      </label>

      <div className="address-location-actions">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="address-location-button"
        >
          {locating ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
        </button>
        {geocodeStatus === "ok" && (
          <span className="address-location-pinned">
            Đã ghim vị trí hiện tại
          </span>
        )}
      </div>

      {(locating || locationAccuracy !== null || locationError) && (
        <div className="address-location-feedback">
          {locating && (
            <small className="address-status address-status-info">
              Đang lấy vị trí chính xác nhất từ trình duyệt...
            </small>
          )}
          {locationAccuracy !== null && !locationError && (
            <small className="address-status address-status-info">
              Độ chính xác hiện tại: khoảng {locationAccuracy}m
            </small>
          )}
          {locationError && (
            <small className="address-status address-status-error">{locationError}</small>
          )}
        </div>
      )}

      {/* Map */}
      <div ref={mapContainer} className="address-map-shell">
        {!HAS_VIETMAP_KEY && (
          <div className="address-map-unavailable">
            Chưa cấu hình VietMap API key
          </div>
        )}
      </div>
      <p className="address-map-hint">
        💡 Nhập địa chỉ để tự động định vị, hoặc click trực tiếp trên bản đồ để
        chọn vị trí chính xác
      </p>

      <input type="hidden" {...register("latitude", { valueAsNumber: true })} />
      <input
        type="hidden"
        {...register("longitude", { valueAsNumber: true })}
      />

      {(errors.latitude || errors.longitude) && (
        <div className="address-coordinate-error">
          ⚠️{" "}
          {errors.latitude?.message ||
            errors.longitude?.message ||
            "Vui lòng chọn vị trí trên bản đồ"}
        </div>
      )}
    </section>
  );
}
