import { useCallback, useRef, useState } from "react";
import {
  getOsrmRoute,
  getRoute,
  type GeocodeResult,
  type LngLat,
  type RouteResult,
  searchGeocodeAddress,
} from "@/shared/services/vietmapService";

type RouteVehicle = "car" | "bike" | "foot" | "motorcycle";

export function useVietMapRoute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const routeSeqRef = useRef(0);

  const geocode = useCallback(async (text: string) => {
    if (!text.trim()) return [];
    setLoading(true);
    setError(null);
    try {
      const results = await searchGeocodeAddress(text);
      setGeocodeResults(results);
      return results;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Geocode thất bại";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const route = useCallback(
    async (
      origin: LngLat,
      destination: LngLat,
      vehicle: RouteVehicle = "car",
    ) => {
      const seq = ++routeSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const vehiclesToTry = Array.from(
          new Set<RouteVehicle>([vehicle, "bike", "car", "foot"]),
        );

        for (const candidateVehicle of vehiclesToTry) {
          try {
            const result = await getRoute(
              origin,
              destination,
              candidateVehicle,
            );
            if (seq === routeSeqRef.current) {
              setRouteResult(result);
            }
            return result;
          } catch (error) {
            console.warn("VietMap route failed:", candidateVehicle, error);
          }
        }

        const osrmResult = await getOsrmRoute(origin, destination);
        if (seq === routeSeqRef.current) {
          setRouteResult(osrmResult);
        }
        return osrmResult;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Tính route thất bại";
        if (seq === routeSeqRef.current) {
          setError(msg);
        }
        return null;
      } finally {
        if (seq === routeSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const clearRoute = useCallback(() => {
    routeSeqRef.current += 1;
    setRouteResult(null);
    setLoading(false);
  }, []);

  return {
    geocode,
    route,
    clearRoute,
    routeResult,
    geocodeResults,
    loading,
    error,
  };
}
