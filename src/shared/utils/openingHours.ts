export type OpeningHoursStatus = {
  isOpen: boolean;
  isHolidayOrClosed: boolean;
  statusText: string;
  statusTone: "open" | "closed" | "holiday";
  nextOpeningText?: string;
};

/**
 * Parses merchant opening hours string and evaluates if the merchant is currently open.
 * Supports:
 * - "07:00 - 22:00"
 * - "06:00 - 13:30 & 16:30 - 21:30" (split shifts)
 * - "Cả ngày (24/7)" or "24/7"
 * - "Tạm nghỉ lễ..." or "Nghỉ..."
 */
export function getMerchantOpenStatus(
  openingHours?: string | null,
  targetDate: Date = new Date(),
): OpeningHoursStatus {
  if (!openingHours || !openingHours.trim()) {
    return {
      isOpen: true,
      isHolidayOrClosed: false,
      statusText: "Đang mở cửa",
      statusTone: "open",
    };
  }

  const raw = openingHours.trim();
  const lower = raw.toLowerCase();

  // 1. Holiday or explicit closure
  if (
    lower.includes("nghỉ") ||
    lower.includes("tạm đóng") ||
    lower.includes("đóng cửa") ||
    lower.includes("tạm nghỉ")
  ) {
    return {
      isOpen: false,
      isHolidayOrClosed: true,
      statusText: "Tạm nghỉ / Đóng cửa",
      statusTone: "holiday",
    };
  }

  // 2. 24/7
  if (lower.includes("24/7") || lower.includes("cả ngày")) {
    return {
      isOpen: true,
      isHolidayOrClosed: false,
      statusText: "Mở cả ngày (24/7)",
      statusTone: "open",
    };
  }

  // 3. Match HH:MM - HH:MM ranges (supporting multiple shifts separated by &, +, ,, và)
  const timeRangeRegex = /(\d{1,2}):(\d{2})\s*(?:-|–|đến|to)\s*(\d{1,2}):(\d{2})/gi;
  const matches = [...raw.matchAll(timeRangeRegex)];

  if (matches.length === 0) {
    // If no standard HH:MM - HH:MM format found, fallback to open
    return {
      isOpen: true,
      isHolidayOrClosed: false,
      statusText: raw,
      statusTone: "open",
    };
  }

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  let isOpen = false;
  let nextOpenFormatted: string | undefined = undefined;

  for (const match of matches) {
    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const endH = parseInt(match[3], 10);
    const endM = parseInt(match[4], 10);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Overnight shift (e.g. 17:00 - 02:00)
    if (endMinutes < startMinutes) {
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
        isOpen = true;
        break;
      }
    } else {
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        isOpen = true;
        break;
      }
    }

    if (!nextOpenFormatted && currentMinutes < startMinutes) {
      nextOpenFormatted = `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
    }
  }

  if (isOpen) {
    return {
      isOpen: true,
      isHolidayOrClosed: false,
      statusText: "Đang mở cửa",
      statusTone: "open",
    };
  }

  const firstMatch = matches[0];
  const firstOpen = `${firstMatch[1].padStart(2, "0")}:${firstMatch[2].padStart(2, "0")}`;

  return {
    isOpen: false,
    isHolidayOrClosed: false,
    statusText: nextOpenFormatted
      ? `Đã đóng cửa • Mở lúc ${nextOpenFormatted}`
      : `Đã đóng cửa • Mở lúc ${firstOpen}`,
    statusTone: "closed",
    nextOpeningText: nextOpenFormatted || firstOpen,
  };
}

export function isMerchantOpenNow(
  openingHours?: string | null,
  targetDate: Date = new Date(),
): boolean {
  return getMerchantOpenStatus(openingHours, targetDate).isOpen;
}
