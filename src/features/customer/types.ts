export type Merchant = {
  id: string;
  name?: string;
  description?: string;
  priceRange?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingHours?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  underratedScore?: number;
  distance?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  status?: string;
  menu?: MerchantMenuItem[];
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
};

export type MerchantFoodTopping = {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
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
