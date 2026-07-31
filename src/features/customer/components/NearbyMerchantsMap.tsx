/**
 * NearbyMerchantsMap - ban do quan an gan ban
 * Su dung VietMap GL JS
 */
import { useMemo } from "react";
import VietMapGL, { type MapMarker } from "@/shared/components/VietMapGL";
import type { Merchant } from "../types";
import { getDisplayUnderratedScore } from "../utils/underratedScore";

type LatLng = { latitude: number; longitude: number };

type Props = Readonly<{
  center: LatLng;
  merchants: Merchant[];
  selectedMerchantId?: string | null;
  onSelectMerchantId?: (id: string) => void;
  /** Toa do route [lng, lat][] de ve duong di */
  routeCoordinates?: [number, number][];
  onLocateCustomer?: () => void;
  locateLoading?: boolean;
  /** If true, make user marker draggable for confirmation */
  editableUserMarker?: boolean;
  onUserMarkerDrag?: (lat: number, lng: number) => void;
}>;

type MerchantRecord = Record<string, unknown>;

const USER_MARKER_ID = "__user-location";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRating(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Chưa có";

  return value.toFixed(2);
}

function getMerchantScale(percent: number | null) {
  if (percent === null) return 1;

  return 1.05 + (percent / 100) * 0.35;
}

function shouldUseFlame(percent: number | null) {
  return percent !== null && percent >= 80;
}

function extractDescriptionField(
  description: string | undefined,
  label: string,
) {
  if (!description) return "";

  const prefix = `${label}:`;

  return (
    description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))
      ?.slice(prefix.length)
      .trim() ?? ""
  );
}

function getMerchantCuisineLabel(merchant: Merchant) {
  const fromDescription = extractDescriptionField(
    merchant.description,
    "Loại món chính",
  );

  if (fromDescription) return fromDescription;

  const menuCategories = merchant.menu
    ?.flatMap((item) => item.categoryDetail ?? [])
    .filter(Boolean)
    .slice(0, 3);

  return menuCategories?.length ? menuCategories.join(", ") : "Chưa cập nhật";
}

function getMerchantPopupHtml(merchant: Merchant) {
  const name = escapeHtml(merchant.name || "Unnamed merchant");
  const ratingText = formatRating(merchant.rating);
  const cuisine = escapeHtml(getMerchantCuisineLabel(merchant));
  const underratedScore = getDisplayUnderratedScore(merchant);
  const underratedHtml =
    underratedScore !== null
      ? `<div style="margin-top:4px;color:#047857;font-size:12px;font-weight:800">US: ${underratedScore.score.toFixed(2)}/1.00</div>`
      : "";

  return `
    <div style="min-width:180px;max-width:220px;padding:2px 0">
      <div style="font-weight:800;font-size:14px;line-height:1.3;color:#0f172a">${name}</div>
      <div style="margin-top:4px;color:#0f766e;font-size:12px;font-weight:700">Review: ${ratingText}</div>
      ${underratedHtml}
      <div style="margin-top:4px;color:#475569;font-size:12px"><strong>Loại món:</strong> ${cuisine}</div>
    </div>
  `;
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

function getMerchantCoords(
  merchant: Merchant,
): { lat: number; lng: number } | null {
  const record = merchant as MerchantRecord;

  const lat = getNumberField(record, ["latitude", "lat", "Latitude", "Lat"]);
  const lng = getNumberField(record, ["longitude", "lng", "Longitude", "Lng"]);

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

export default function NearbyMerchantsMap({
  center,
  merchants,
  selectedMerchantId,
  onSelectMerchantId,
  routeCoordinates,
  onLocateCustomer,
  locateLoading,
  editableUserMarker,
  onUserMarkerDrag,
}: Props) {
  const markers = useMemo<MapMarker[]>(() => {
    const userMarker: MapMarker = {
      id: USER_MARKER_ID,
      lat: center.latitude,
      lng: center.longitude,
      type: "user",
      draggable: !!editableUserMarker,
      popupHtml:
        '<div style="font-weight:700;font-size:13px;padding:2px 4px">Vị trí của bạn</div>',
    };

    const merchantMarkers = merchants.flatMap((merchant) => {
      const coords = getMerchantCoords(merchant);
      if (!coords) return [];

      const underratedScore = getDisplayUnderratedScore(merchant);
      const underratedPercent =
        underratedScore !== null ? underratedScore.percent : null;
      return [
        {
          id: merchant.id,
          lat: coords.lat,
          lng: coords.lng,
          type: "restaurant" as const,
          scale: getMerchantScale(underratedPercent),
          flame: shouldUseFlame(underratedPercent),
          popupHtml: getMerchantPopupHtml(merchant),
        },
      ];
    });

    return [userMarker, ...merchantMarkers];
  }, [center.latitude, center.longitude, editableUserMarker, merchants]);

  return (
    <div className="relative h-full w-full">
      <VietMapGL
        centerLng={center.longitude}
        centerLat={center.latitude}
        zoom={14}
        markers={markers}
        selectedMarkerId={selectedMerchantId}
        onMarkerClick={(markerId) => {
          if (markerId !== USER_MARKER_ID) {
            onSelectMerchantId?.(markerId);
          }
        }}
        routeCoordinates={routeCoordinates}
        routeColor="#e11d48"
        fitToMarkers
        onLocateClick={onLocateCustomer}
        locateLoading={locateLoading}
        editableUserMarker={editableUserMarker}
        onUserMarkerDrag={(lng, lat) => onUserMarkerDrag?.(lat, lng)}
        className="h-full w-full"
      />
    </div>
  );
}
