export type UserRole = "Customer" | "Reviewer" | "Merchant" | "Staff" | "Admin";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pageIndex: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } | null;
  errors?: unknown;
  traceId?: string;
  timestampUtc?: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type JwtPayload = {
  UserId?: string;
  Email?: string;
  Name?: string;
  Role?: UserRole;
  CustomerId?: string;
  MerchantId?: string;
  AvatarUrl?: string | null;
  exp?: number;
};

export type Merchant = {
  id: string;
  name: string;
  rating: number;
  distance?: number | null;
  description?: string;
  logoUrl?: string;
  address?: string;
};

export type Category = {
  id: string;
  name: string;
  parentId?: string | null;
  slug?: string;
  description?: string;
};

export type DiscoveryOptions = {
  restaurantTypes: string[];
  priceRanges: string[];
  foodCategories: Category[];
};

export type Food = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  merchantId?: string;
  isAvailable?: boolean;
  categoryIds?: string[];
};

export type CreateFoodRequest = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  merchantId?: string;
  isAvailable: boolean;
  categoryIds: string[];
};

export type CreateFoodResponse = {
  id: string;
  name: string;
  price: number;
  message: string;
};

export type MerchantOrderSummary = {
  orderId: string;
  finalPrice: number;
  deliveryAddress: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  paymentMethod: string;
  paymentStatus?: string;
  orderType?: string;
  status: string;
  customerName: string;
  createdAt: string;
};

export type CustomerOrderSummary = {
  orderId: string;
  name: string;
  discount?: number;
  finalPrice: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  bill?: {
    id?: string;
    status?: string;
    method?: string;
  } | null;
  orderedAt: string;
  notes?: string;
  deliveryAddress: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  orderType?: string;
  rejectionReason?: string | null;
};

export type CustomerOrderDetailItem = {
  orderDetailId: string;
  orderId: string;
  foodId: string;
  merchantId?: string;
  merchantName?: string;
  name?: string;
  imageUrl?: string;
  unitPrice?: number;
  lineTotal?: number;
  quantity?: number;
  notes?: string;
  note?: string;
  toppings?: {
    foodToppingId?: string;
    name?: string;
    price?: number;
  }[];
};

export type Application = {
  id: string;
  merchantName?: string;
  status?: string;
  createdAt?: string;
  email?: string;
  address?: string;
};
