export type MerchantFoodTopping = {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
};

export type MerchantMenuItem = {
  id: string;
  foodId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryDetail?: string[];
  toppings?: MerchantFoodTopping[];
  isCombo?: boolean;
  originalPrice?: number | null;
  servingSize?: string | null;
  comboItems?: {
    id?: string;
    foodId: string;
    quantity: number;
    food?: {
      id: string;
      name: string;
      price: number;
      imageUrl?: string | null;
      isAvailable?: boolean;
    };
  }[];
};

export type SponsoredCampaign = {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  startAt?: string;
  endAt?: string;
};

export type GemSignals = {
  qualityScore?: number;
  exposureScore?: number;
  underratedScore?: number;
  rating?: number;
  verifiedReviews?: number;
  verifiedVisits?: number;
  exposureWindowDays?: number;
  lastRebalancedAt?: string | null;
};

export type Merchant = {
  id: string;
  name?: string;
  description?: string;
  restaurantType?: string;
  mainDishType?: string;
  priceRange?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingHours?: string;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankTransferEnabled?: boolean;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  totalViews?: number;
  underratedScore?: number;
  strengthIndex?: number;
  isUnderrated?: boolean;
  gemStatus?: "HiddenGem" | "RisingGem" | "HallOfFame" | null;
  gemSignals?: GemSignals;
  distance?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  status?: string;
  hasActiveCampaign?: boolean;
  checkInCount?: number;
  isFavorite?: boolean;
  isFlop?: boolean;
  isBoosted?: boolean;
  checkInPerks?: string[];
  featuredFoods?: string[];
  preferenceScore?: number;
  recommendationScore?: number;
  discoveryType?: "Organic" | "Sponsored";
  isSponsored?: boolean;
  sponsoredCampaign?: SponsoredCampaign;
  menu?: MerchantMenuItem[];
};

export type SponsoredMerchant = Merchant & {
  discoveryType: "Sponsored";
  isSponsored: true;
  sponsoredCampaign: SponsoredCampaign;
};

export type MerchantDetail = Merchant & {
  foods?: MerchantMenuItem[];
  menu?: MerchantMenuItem[];
};

export type CustomerProfile = {
  userId?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  avatarUrl?: string | null;
  customerCode?: string;
  reviewerPoints?: number | null;
  reviewerRank?: string | null;
  gemPoints?: number | null;
  contributionRank?: string | null;
};

export type CustomerOrderSummary = {
  name?: string;
  discount?: number;
  finalPrice?: number;
  status?: string;
  orderedAt?: string;
  notes?: string;
  deliveryAddress?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CreateOrderItem = {
  foodId: string;
  quantity: number;
  notes?: string | null;
};
