export type UserRole = "Customer" | "Reviewer" | "Merchant" | "Staff" | "Admin";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
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
  paymentMethod: string;
  orderType?: string;
  status: string;
  customerName: string;
  createdAt: string;
};

export type CustomerOrderSummary = {
  id?: string;
  orderId?: string;
  name: string;
  discount?: number;
  finalPrice: number;
  status: string;
  orderedAt: string;
  notes?: string;
  deliveryAddress: string;
};

export type CustomerOrderDetailItem = {
  id?: string;
  orderDetailId?: string;
  orderId?: string;
  foodId: string;
  merchantId?: string;
  merchantName?: string;
  name?: string;
  unitPrice?: number;
  lineTotal?: number;
  quantity?: number;
  notes?: string;
  note?: string;
  toppings?: {
    id?: string;
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
