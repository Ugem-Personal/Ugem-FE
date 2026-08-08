/**
 * Removes the POI name from the beginning of an address if it was concatenated by the geocoding service.
 * e.g., "Bún Ốc Ngon Ngon 161 Tân Hòa, Phường..." -> "161 Tân Hòa, Phường..."
 */
export function cleanAddress(address?: string) {
  if (!address) return "";

  // Geocoding services may prepend a Google/Open Location Code when a street
  // address is unavailable, for example: "7P28WQ98+HM Phường Dĩ An, ...".
  // Keep the human-readable locality and discard only the leading code.
  const withoutPlusCode = address
    .trim()
    .replace(
      /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(?=\s|,|$)[\s,;:-]*/i,
      "",
    )
    .trim();

  const match = withoutPlusCode.match(/^([^,0-9]{3,40})\s+(\d+.*)$/);
  if (match) {
    const prefix = match[1].toLowerCase().trim();
    // Allow standard address prefixes
    if (!prefix.match(/^(số|đường|kiốt|kios|kiot|lô|tầng|quận|huyện|phường|xã|thị trấn|q|p)\s*$/)) {
      return match[2].trim();
    }
  }
  return withoutPlusCode;
}

/** True when an address contains a concrete house number instead of only an administrative area. */
export function isDetailedAddress(address?: string) {
  const cleaned = cleanAddress(address);
  if (!cleaned) return false;

  return /(?:^|,\s*)\d{1,5}(?:[/-]\d{1,5})*[a-z]?\s+\p{L}/iu.test(
    cleaned,
  );
}

/** True when the address identifies at least a street/road, not only an administrative area. */
export function hasStreetLevelAddress(address?: string) {
  const cleaned = cleanAddress(address);
  if (!cleaned) return false;

  return (
    isDetailedAddress(cleaned) ||
    /(?:^|[\s,])(đường|phố|đại lộ|quốc lộ|tỉnh lộ|hẻm|ngõ|ngách|kiệt)\s+\p{L}/iu.test(
      cleaned,
    )
  );
}
