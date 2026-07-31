/**
 * Removes the POI name from the beginning of an address if it was concatenated by the geocoding service.
 * e.g., "Bún Ốc Ngon Ngon 161 Tân Hòa, Phường..." -> "161 Tân Hòa, Phường..."
 */
export function cleanAddress(address?: string) {
  if (!address) return "";
  
  const match = address.match(/^([^,0-9]{3,40})\s+(\d+.*)$/);
  if (match) {
    const prefix = match[1].toLowerCase().trim();
    // Allow standard address prefixes
    if (!prefix.match(/^(số|đường|kiốt|kios|kiot|lô|tầng|quận|huyện|phường|xã|thị trấn|q|p)\s*$/)) {
      return match[2];
    }
  }
  return address;
}
