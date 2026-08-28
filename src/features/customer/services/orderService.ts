import { api } from "@/lib/axios";
import type {
  ApiResponse,
  CustomerOrderDetailItem,
  CustomerOrderSummary,
} from "@/shared/types";

export type CreateOrderItem = {
  foodId: string;
  quantity: number;
  notes?: string | null;
  foodToppingIds?: string[];
};

export type CustomerOrderType = "Online" | "Offline";

export async function createOrder(payload: {
  name: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  notes?: string;
  orderType?: CustomerOrderType;
  paymentMethod?: "Cash" | "BankTransfer" | "COD";
  finalPrice: number;
  affiliateLinkCode?: string;
  campaignId?: string;
  foods: CreateOrderItem[];
}) {
  const orderType = payload.orderType ?? "Online";

  const res = await api.post<ApiResponse<null>>("/orders", {
    name: payload.name,
    paymentMethod:
      payload.paymentMethod ?? (orderType === "Online" ? "COD" : "Cash"),
    orderType,
    deliveryAddress:
      orderType === "Online" ? payload.deliveryAddress : "Tại quán",
    deliveryLatitude:
      orderType === "Online" ? payload.deliveryLatitude : undefined,
    deliveryLongitude:
      orderType === "Online" ? payload.deliveryLongitude : undefined,
    notes: payload.notes || "",
    affiliateLinkCode: payload.affiliateLinkCode,
    campaignId: payload.campaignId,
    foods: payload.foods.map((f) => ({
      foodId: f.foodId,
      quantity: f.quantity,
      notes: f.notes ?? undefined,
      foodToppingIds: f.foodToppingIds ?? undefined,
    })),
  });

  return res.data;
}

export type CheckoutCampaign = {
  id: string;
  code: string;
  title: string;
  discountValue: number;
  isPercentage: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  quantity?: number | null;
  usedCount?: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

export async function getMerchantCheckoutCampaigns(merchantId: string) {
  const res = await api.get<ApiResponse<CheckoutCampaign[]>>(
    `/campaigns/merchant/${merchantId}`,
  );

  return res.data.data ?? [];
}

export async function getCustomerOrders(params?: {
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  const res = await api.get<ApiResponse<CustomerOrderSummary[]>>(
    "/orders/mine",
    { params },
  );

  return {
    data: (res.data.data ?? []).map(normalizeCustomerOrder),
    meta: res.data.meta ?? null,
  };
}

export function getCustomerOrderId(
  order?: Partial<CustomerOrderSummary> | null,
) {
  return normalizeOrderId(order?.orderId);
}

function normalizeCustomerOrder(
  order: CustomerOrderSummary,
): CustomerOrderSummary {
  const orderId = getCustomerOrderId(order);
  const status = normalizeOrderStatus(order.status);

  if (orderId == null) {
    console.warn("[orders/mine] Missing order id in customer order summary", {
      keys: Object.keys(order),
      order,
    });
  }

  return {
    ...order,
    orderId: orderId ?? order.orderId,
    status,
  };
}

function normalizeOrderStatus(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeOrderId(value: unknown) {
  if (value == null) return undefined;

  const normalized = String(value).trim();

  if (!normalized || normalized === "00000000-0000-0000-0000-000000000000") {
    return undefined;
  }

  return normalized;
}

export async function getCustomerOrderDetail(orderId: string) {
  const res = await api.get<ApiResponse<{ foods: CustomerOrderDetailItem[] }>>(
    `/orders/${orderId}`,
  );

  return res.data.data.foods;
}

export async function confirmReceived(orderId: string) {
  const res = await api.patch<ApiResponse<null>>(`/orders/${orderId}/status`, {
    status: "Completed",
  });

  return res.data;
}

export async function requestCashPayment(orderId: string) {
  const res = await api.patch<ApiResponse<null>>(
    `/orders/${orderId}/cash/request`,
  );

  return res.data;
}

export async function confirmNotReceived(orderId: string) {
  const res = await api.patch<ApiResponse<null>>(`/orders/${orderId}/status`, {
    status: "NotReceived",
  });

  return res.data;
}

export async function getBill(orderId: string) {
  const res = await api.get<ApiResponse<unknown> | unknown>("/orders/bill", {
    params: { orderId },
  });

  // unwrap if ApiResponse
  const payload = (res.data ?? res) as unknown;
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }

  return payload;
}

export async function confirmBill(
  orderId: string,
  paymentMethod?: "Cash" | "BankTransfer",
) {
  const res = await api.post<ApiResponse<null>>("/orders/bill/confirm", {
    orderId,
    paymentMethod,
  });

  return res.data;
}

export async function rejectBill(orderId: string, reason: string) {
  const res = await api.post<ApiResponse<null>>("/orders/bill/reject", {
    orderId,
    reason,
  });

  return res.data;
}
