// ============================================================
// VietMap API Service
// Tích hợp: Geocode (text → tọa độ) + Route (tìm đường)
// ============================================================

const VIETMAP_TILE_KEY = import.meta.env.VITE_VIETMAP_TILE_KEY ?? "";
const VIETMAP_API_KEY =
  import.meta.env.VITE_VIETMAP_API_KEY ?? VIETMAP_TILE_KEY ?? "";
const VIETMAP_SERVICE_KEY = import.meta.env.VITE_VIETMAP_SERVICE_KEY ?? "";

const HAS_VIETMAP_KEY =
  Boolean(VIETMAP_API_KEY) && VIETMAP_API_KEY !== "YOUR_VIETMAP_API_KEY_HERE";

const HAS_VIETMAP_SERVICE_KEY =
  Boolean(VIETMAP_SERVICE_KEY) &&
  VIETMAP_SERVICE_KEY !== "YOUR_VIETMAP_API_KEY_HERE";

const VIETMAP_STYLE_BASE = `https://maps.vietmap.vn/maps/styles`;

/** Return a style URL for a given style name (e.g. 'lm', 'tm', 'tm2'). */
export function getVietmapStyleUrl(styleName = "tm") {
  return `${VIETMAP_STYLE_BASE}/${styleName}/style.json?apikey=${VIETMAP_API_KEY}`;
}

// Default style URL (legacy export)
export const VIETMAP_STYLE_URL = getVietmapStyleUrl();

export {
  HAS_VIETMAP_KEY,
  HAS_VIETMAP_SERVICE_KEY,
  VIETMAP_API_KEY,
  VIETMAP_TILE_KEY,
  VIETMAP_SERVICE_KEY,
};

// Debug: print masked runtime env info in development to help troubleshooting
if (import.meta.env.DEV) {
  try {
    const mask = (s: string) => (s ? `${s.slice(0, 6)}…` : "(empty)");
    console.debug("[vietmapService] VIETMAP_API_KEY:", mask(VIETMAP_API_KEY));
    console.debug("[vietmapService] VIETMAP_TILE_KEY:", mask(VIETMAP_TILE_KEY));
    console.debug(
      "[vietmapService] VIETMAP_SERVICE_KEY:",
      mask(VIETMAP_SERVICE_KEY),
    );
    console.debug(
      "[vietmapService] HAS_VIETMAP_KEY, HAS_VIETMAP_SERVICE_KEY:",
      HAS_VIETMAP_KEY,
      HAS_VIETMAP_SERVICE_KEY,
    );
  } catch {
    /* ignore */
  }
}
// ─── Types ────────────────────────────────────────────────────

export type LngLat = { lng: number; lat: number };

export interface GeocodeResult {
  ref_id: string;
  name: string;
  display: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteStep {
  distance: number; // metres
  duration: number; // seconds
  instruction: string;
}

export interface RouteResult {
  /** Array of [lng, lat] pairs forming the path */
  coordinates: [number, number][];
  distance: number; // total metres
  duration: number; // total seconds
  steps: RouteStep[];
}

// ─── Geocode: địa chỉ text → tọa độ ─────────────────────────

export type GeocodeOptions = {
  proximity?: { lat: number; lng: number } | null;
  size?: number;
};

function haversineDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a =
    sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function geocodeAddress(
  text: string,
  opts: GeocodeOptions = {},
): Promise<GeocodeResult[]> {
  if (!HAS_VIETMAP_SERVICE_KEY)
    throw new Error("Chưa cấu hình VietMap Service key");

  const size = opts.size ?? 10;
  const url = new URL("https://maps.vietmap.vn/api/search/v3");
  url.searchParams.set("apikey", VIETMAP_SERVICE_KEY);
  url.searchParams.set("text", text);
  url.searchParams.set("size", String(size));
  if (opts.proximity) {
    url.searchParams.set(
      "focus",
      `${opts.proximity.lat},${opts.proximity.lng}`,
    );
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocode API error: ${res.status}`);

  const json: unknown = await res.json();
  const root =
    typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : {};
  const raw = Array.isArray(json) ? getRecords(json) : getRecords(root.data);

  // Try to normalize to our GeocodeResult shape. If the API already returns
  // matching fields (lat/lng/display/address) we'll use them as-is.
  const resolvedResults: GeocodeResult[] = await Promise.all(
    raw.map(async (r) => {
      const refId = getText(r.id) || getText(r.ref_id);
      const directLat = Number(r.lat ?? r.latitude ?? r.y ?? Number.NaN);
      const directLng = Number(r.lng ?? r.longitude ?? r.x ?? Number.NaN);
      const hasDirectCoords =
        Number.isFinite(directLat) && Number.isFinite(directLng);
      const place = hasDirectCoords ? null : await getPlaceByRefId(refId);

      return {
        ref_id: refId,
        name:
          getText(place?.name) ||
          getText(r.name) ||
          getText(r.display) ||
          getText(r.address),
        display:
          getText(place?.display) ||
          getText(r.display) ||
          getText(r.name) ||
          getText(r.address),
        address:
          getText(place?.address) || getText(r.address) || getText(r.display),
        lat: hasDirectCoords ? directLat : Number(place?.lat ?? Number.NaN),
        lng: hasDirectCoords ? directLng : Number(place?.lng ?? Number.NaN),
      };
    }),
  );
  const results = resolvedResults.filter(
    (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
  );

  // If proximity provided, sort by distance to improve local relevance
  if (opts.proximity && results.length > 0) {
    const { lat: pLat, lng: pLng } = opts.proximity;
    results.sort(
      (a, b) =>
        haversineDistanceKm(pLat, pLng, a.lat, a.lng) -
        haversineDistanceKm(pLat, pLng, b.lat, b.lng),
    );
  }

  return results;
}

export async function searchGeocodeAddress(
  text: string,
  opts: GeocodeOptions = {},
): Promise<GeocodeResult[]> {
  const query = text.trim();
  if (!query) return [];

  if (opts.proximity) {
    const proxiedResults = await geocodeAddress(query, opts);
    if (proxiedResults.length > 0) {
      return proxiedResults;
    }
  }

  const fallbackOptions = opts.proximity
    ? { ...opts, proximity: undefined }
    : opts;
  return geocodeAddress(query, fallbackOptions);
}

async function getPlaceByRefId(
  refId: string,
): Promise<Record<string, unknown> | null> {
  if (!refId) return null;

  try {
    const url = new URL("https://maps.vietmap.vn/api/place/v3");
    url.searchParams.set("apikey", VIETMAP_SERVICE_KEY);
    url.searchParams.set("refid", refId);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const payload: unknown = await res.json();
    if (typeof payload === "object" && payload !== null) {
      return payload as Record<string, unknown>;
    }
  } catch (error) {
    console.warn("VietMap place lookup failed:", error);
  }

  return null;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

function getReverseRecords(payload: unknown): Record<string, unknown>[] {
  const directRecords = getRecords(payload);
  if (directRecords.length > 0) return directRecords;

  if (typeof payload !== "object" || payload === null) return [];
  const root = payload as Record<string, unknown>;

  for (const key of ["data", "list", "results"]) {
    const records = getRecords(root[key]);
    if (records.length > 0) return records;
  }

  return [];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  if (!HAS_VIETMAP_SERVICE_KEY)
    throw new Error("Chưa cấu hình VietMap Service key");

  const url = new URL("https://maps.vietmap.vn/api/reverse/v4");
  url.searchParams.set("apikey", VIETMAP_SERVICE_KEY);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("display_type", "1");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Reverse API error: ${res.status}`);

  const records = getReverseRecords(await res.json());
  const first = records[0];
  if (!first) return "";

  const display = getText(first.display);
  if (display) return display;

  const name = getText(first.name);
  const address = getText(first.address);
  return [name, address].filter(Boolean).join(" ");
}

// ─── Route: tính đường đi giữa 2 điểm ───────────────────────

export async function getRoute(
  origin: LngLat,
  destination: LngLat,
  vehicle: "car" | "bike" | "foot" | "motorcycle" = "motorcycle",
): Promise<RouteResult> {
  if (!HAS_VIETMAP_SERVICE_KEY)
    throw new Error("Chưa cấu hình VietMap Service key");

  const url = new URL("https://maps.vietmap.vn/api/route");
  url.searchParams.set("api-version", "1.1");
  url.searchParams.set("apikey", VIETMAP_SERVICE_KEY);
  url.searchParams.append("point", `${origin.lat},${origin.lng}`);
  url.searchParams.append("point", `${destination.lat},${destination.lng}`);
  url.searchParams.set("vehicle", vehicle);
  url.searchParams.set("points_encoded", "false");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Route API error: ${res.status}`);

  const json = await res.json();
  const path = json?.paths?.[0];
  if (!path) throw new Error("Không tìm được đường đi");

  const rawPoints = Array.isArray(path.points?.coordinates)
    ? path.points.coordinates
    : Array.isArray(path.points)
      ? path.points
      : [];

  const apiCoordinates: [number, number][] = rawPoints
    .map((item: unknown) => {
      if (!Array.isArray(item) || item.length < 2) return null;

      const a = Number(item[0]);
      const b = Number(item[1]);

      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

      // Map cần [lng, lat]
      // Nếu API trả [lat, lng] thì đảo lại
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        return [b, a] as [number, number];
      }

      return [a, b] as [number, number];
    })
    .filter((item: unknown): item is [number, number] => item !== null);
  const coordinates =
    apiCoordinates.length >= 2
      ? apiCoordinates
      : ([
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ] satisfies [number, number][]);

  const steps: RouteStep[] = (path.instructions ?? []).map(
    (ins: { distance: number; time: number; text: string }) => ({
      distance: ins.distance,
      duration: ins.time / 1000,
      instruction: ins.text,
    }),
  );

  return {
    coordinates,
    distance: path.distance ?? 0,
    duration: (path.time ?? 0) / 1000,
    steps,
  };
}

type OsrmManeuver = {
  type?: string;
  modifier?: string;
};

type OsrmStep = {
  distance?: number;
  duration?: number;
  name?: string;
  maneuver?: OsrmManeuver;
};

function formatOsrmInstruction(step: OsrmStep) {
  const road = getText(step.name);
  const type = step.maneuver?.type ?? "";
  const modifier = step.maneuver?.modifier ?? "";

  if (type === "arrive") return "Đến nơi";
  if (type === "depart") return road ? `Bắt đầu đi theo ${road}` : "Bắt đầu";
  if (type === "turn") {
    if (modifier.includes("left"))
      return road ? `Rẽ trái vào ${road}` : "Rẽ trái";
    if (modifier.includes("right"))
      return road ? `Rẽ phải vào ${road}` : "Rẽ phải";
  }
  if (type === "roundabout")
    return road ? `Vào vòng xoay theo ${road}` : "Vào vòng xoay";
  if (type === "merge") return road ? `Nhập làn vào ${road}` : "Nhập làn";

  return road ? `Đi tiếp theo ${road}` : "Đi tiếp";
}

export async function getOsrmRoute(
  origin: LngLat,
  destination: LngLat,
): Promise<RouteResult> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
  );
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OSRM route API error: ${res.status}`);

  const json: unknown = await res.json();
  const root =
    typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : {};
  const routes = getRecords(root.routes);
  const firstRoute = routes[0];
  if (!firstRoute) throw new Error("Không tìm được đường đi");

  const geometry =
    typeof firstRoute.geometry === "object" && firstRoute.geometry !== null
      ? (firstRoute.geometry as Record<string, unknown>)
      : {};
  const coordinates = getRecords(geometry.coordinates)
    .map((item) => Object.values(item).map(Number))
    .filter(
      (item): item is [number, number] =>
        item.length >= 2 &&
        Number.isFinite(item[0]) &&
        Number.isFinite(item[1]),
    )
    .map(([lng, lat]) => [lng, lat] as [number, number]);

  const legs = getRecords(firstRoute.legs);
  const steps = legs.flatMap((leg) =>
    getRecords(leg.steps).map((step) => {
      const typedStep = step as OsrmStep;
      return {
        distance: Number(typedStep.distance ?? 0),
        duration: Number(typedStep.duration ?? 0),
        instruction: formatOsrmInstruction(typedStep),
      };
    }),
  );

  return {
    coordinates:
      coordinates.length >= 2
        ? coordinates
        : [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
    distance: Number(firstRoute.distance ?? 0),
    duration: Number(firstRoute.duration ?? 0),
    steps,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

export function metersToKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function secondsToText(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} giờ ${rem} phút` : `${h} giờ`;
}
