const CATEGORY_LABELS: Record<string, string> = {
  drink: "Đồ uống",
  drinks: "Đồ uống",
  beverage: "Đồ uống",
  beverages: "Đồ uống",
  "main dish": "Món chính",
  "main course": "Món chính",
  appetizer: "Món khai vị",
  appetizers: "Món khai vị",
  starter: "Món khai vị",
  starters: "Món khai vị",
  dessert: "Món tráng miệng",
  desserts: "Món tráng miệng",
  snack: "Món ăn nhẹ",
  snacks: "Món ăn nhẹ",
  vietnamese: "Món Việt",
  "vietnamese food": "Món Việt",
};

export const FOOD_TYPE_OPTIONS = [
  "Món chính",
  "Món ăn nhẹ",
  "Món khai vị",
  "Món tráng miệng",
  "Đồ uống",
] as const;

export const CUISINE_OPTIONS = [
  "Việt Nam",
  "Hàn Quốc",
  "Nhật Bản",
  "Trung Quốc",
  "Thái Lan",
  "Âu",
  "Món kết hợp",
  "Khác",
] as const;

/**
 * Converts API-facing category names into clear Vietnamese labels for the UI.
 * The original category name/id should still be used for form values and API calls.
 */
export function getCategoryDisplayName(name: string) {
  const cleanedName = name
    .trim()
    .replace(/\s*(?:[-–—]\s*)?(?:UAT|TEST)\s*$/i, "")
    .trim();

  const normalizedName = cleanedName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");

  return CATEGORY_LABELS[normalizedName] ?? cleanedName;
}

export function isFoodTypeCategoryName(name: string) {
  const displayName = getCategoryDisplayName(name);
  return FOOD_TYPE_OPTIONS.some((foodType) => foodType === displayName);
}
