/**
 * VietMapDemoPage – Trang demo tất cả tính năng VietMap
 *
 * Bao gồm:
 *  1. Bản đồ VietMap GL
 *  2. Ghim markers từ dữ liệu người dùng nhập
 *  3. Geocode: nhập địa chỉ → lấy tọa độ
 *  4. Route: vẽ đường đi giữa 2 điểm
 */
import { useState, useCallback } from "react";
import VietMapGL from "@/shared/components/VietMapGL";
import { useVietMapRoute } from "@/shared/hooks/useVietMapRoute";
import {
  metersToKm,
  secondsToText,
  type LngLat,
} from "@/shared/services/vietmapService";

type Tab = "markers" | "geocode" | "route";

export default function VietMapDemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("markers");

  const [routeCoords, setRouteCoords] = useState<
    [number, number][] | undefined
  >();

  // Geocode state
  const [searchText, setSearchText] = useState("");

  // Route state
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [originCoord, setOriginCoord] = useState<LngLat | null>(null);
  const [destCoord, setDestCoord] = useState<LngLat | null>(null);

  const {
    geocode,
    route,
    routeResult,
    geocodeResults,
    loading,
    error,
    clearRoute,
  } = useVietMapRoute();

  const allMarkers = [
    ...(originCoord
      ? [
          {
            id: "__origin__",
            lat: originCoord.lat,
            lng: originCoord.lng,
            type: "user" as const,
            popupHtml: `<div><strong>Điểm xuất phát</strong></div>`,
          },
        ]
      : []),
    ...(destCoord
      ? [
          {
            id: "__dest__",
            lat: destCoord.lat,
            lng: destCoord.lng,
            type: "custom" as const,
            color: "#ef4444",
            popupHtml: `<div><strong>Điểm đến</strong></div>`,
          },
        ]
      : []),
  ];

  // ── Geocode handler ──
  const handleGeocode = useCallback(async () => {
    await geocode(searchText);
  }, [geocode, searchText]);

  // ── Route handler ──
  const handleRoute = useCallback(async () => {
    if (!originCoord || !destCoord) return;
    const result = await route(originCoord, destCoord, "car");
    if (result) setRouteCoords(result.coordinates);
  }, [route, originCoord, destCoord]);

  const handleGeocodeForOrigin = useCallback(async () => {
    const results = await geocode(originText);
    if (results[0]) {
      setOriginCoord({ lat: results[0].lat, lng: results[0].lng });
    }
  }, [geocode, originText]);

  const handleGeocodeForDest = useCallback(async () => {
    const results = await geocode(destText);
    if (results[0]) {
      setDestCoord({ lat: results[0].lat, lng: results[0].lng });
    }
  }, [geocode, destText]);

  return (
    <div className="min-h-screen bg-linear-to-br from-cyan-50 via-slate-50 to-amber-50">
      {/* Header */}
      <div className="border-b border-white/70 bg-white/85 px-6 py-4 flex items-center gap-3 backdrop-blur">
        <span className="text-2xl">🗺️</span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">VietMap Demo</h1>
          <p className="text-sm text-slate-500">
            Bản đồ · Markers · Geocode · Route
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* ── Sidebar ── */}
        <div className="w-80 border-r border-white/70 bg-white/85 flex flex-col overflow-y-auto backdrop-blur">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {(
              [
                { key: "markers", label: "📍 Markers" },
                { key: "geocode", label: "🔍 Geocode" },
                { key: "route", label: "🛣️ Route" },
              ] as { key: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-cyan-600 text-cyan-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* ─ Tab: Markers ─ */}
            {activeTab === "markers" && (
              <div className="space-y-3">
                <h2 className="font-semibold text-slate-800">
                  Không có dữ liệu hiển thị sẵn
                </h2>
                <p className="text-sm text-slate-600">
                  Bản đồ chỉ hiển thị các điểm bạn tự geocode hoặc chọn khi tạo
                  route.
                </p>
              </div>
            )}

            {/* ─ Tab: Geocode ─ */}
            {activeTab === "geocode" && (
              <div className="space-y-3">
                <h2 className="font-semibold text-slate-800">
                  Chuyển địa chỉ → Tọa độ
                </h2>
                <p className="text-xs text-slate-500">
                  Nhập địa chỉ bất kỳ để VietMap trả về kinh độ, vĩ độ.
                </p>

                <div className="flex gap-2">
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
                    placeholder="VD: 260 Pasteur, Quận 3"
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleGeocode}
                    disabled={loading || !searchText.trim()}
                    className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Tìm
                  </button>
                </div>

                {loading && (
                  <p className="text-xs text-cyan-600">Đang tìm kiếm…</p>
                )}
                {error && <p className="text-xs text-rose-500">{error}</p>}

                {geocodeResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Kết quả ({geocodeResults.length}):
                    </p>
                    {geocodeResults.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                      >
                        <div className="font-medium text-slate-800">
                          {r.display || r.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          📌 {r.lat.toFixed(6)}, {r.lng.toFixed(6)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─ Tab: Route ─ */}
            {activeTab === "route" && (
              <div className="space-y-3">
                <h2 className="font-semibold text-slate-800">Tính đường đi</h2>
                <p className="text-xs text-slate-500">
                  Nhập 2 địa chỉ để VietMap tính đường đi ngắn nhất.
                </p>

                {/* Origin */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    🟢 Điểm xuất phát
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={originText}
                      onChange={(e) => setOriginText(e.target.value)}
                      placeholder="VD: Bến Thành, Q.1"
                      className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleGeocodeForOrigin}
                      disabled={loading || !originText.trim()}
                      className="rounded-md bg-emerald-600 px-2 py-2 text-xs text-white disabled:opacity-50"
                    >
                      OK
                    </button>
                  </div>
                  {originCoord && (
                    <p className="mt-1 text-xs text-emerald-600">
                      ✓ {originCoord.lat.toFixed(5)},{" "}
                      {originCoord.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                {/* Destination */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    🔴 Điểm đến
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={destText}
                      onChange={(e) => setDestText(e.target.value)}
                      placeholder="VD: Sân bay Tân Sơn Nhất"
                      className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      onClick={handleGeocodeForDest}
                      disabled={loading || !destText.trim()}
                      className="rounded-md bg-rose-500 px-2 py-2 text-xs text-white disabled:opacity-50"
                    >
                      OK
                    </button>
                  </div>
                  {destCoord && (
                    <p className="mt-1 text-xs text-rose-500">
                      ✓ {destCoord.lat.toFixed(5)}, {destCoord.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                {/* Calculate */}
                <button
                  onClick={handleRoute}
                  disabled={loading || !originCoord || !destCoord}
                  className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
                >
                  {loading ? "Đang tính…" : "🛣️ Tính đường đi"}
                </button>

                {error && <p className="text-xs text-rose-500">{error}</p>}

                {/* Route result */}
                {routeResult && (
                  <div className="space-y-3 rounded-xl bg-cyan-50 p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-cyan-900">
                        Kết quả
                      </span>
                      <button
                        onClick={() => {
                          clearRoute();
                          setRouteCoords(undefined);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕ Xoá
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white p-2 text-center">
                        <div className="text-lg font-bold text-cyan-700">
                          {metersToKm(routeResult.distance)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Khoảng cách
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-2 text-center">
                        <div className="text-lg font-bold text-cyan-700">
                          {secondsToText(routeResult.duration)}
                        </div>
                        <div className="text-xs text-slate-500">Thời gian</div>
                      </div>
                    </div>

                    {routeResult.steps.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          Hướng dẫn đường đi:
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {routeResult.steps.map((step, i) => (
                            <div
                              key={i}
                              className="flex gap-2 text-xs text-slate-700"
                            >
                              <span className="shrink-0 text-cyan-500">
                                {i + 1}.
                              </span>
                              <span>{step.instruction}</span>
                              <span className="ml-auto shrink-0 text-slate-400">
                                {metersToKm(step.distance)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <VietMapGL
            centerLng={106.6942}
            centerLat={10.7736}
            zoom={13}
            markers={allMarkers}
            selectedMarkerId={undefined}
            onMarkerClick={() => undefined}
            routeCoordinates={routeCoords}
            routeColor="#3b82f6"
            className="h-full w-full"
          />

          {/* Map legend */}
          <div className="absolute bottom-6 left-4 space-y-1.5 rounded-xl border border-white/70 bg-white/90 p-3 text-xs shadow-lg backdrop-blur">
            <p className="mb-2 font-semibold text-slate-700">Chú thích</p>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-white bg-cyan-500 shadow" />
              <span>Điểm xuất phát</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow" />
              <span>Điểm đến</span>
            </div>
            {routeCoords && (
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 rounded-full bg-cyan-600" />
                <span>Đường đi</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
