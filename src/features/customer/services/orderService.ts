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
  notes?: string;
  orderType?: CustomerOrderType;
  paymentMethod?: "Cash" | "BankTransfer" | "COD";
  finalPrice: number;
  affiliateLinkCode?: string;
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
    notes: payload.notes || "",
    affiliateLinkCode: payload.affiliateLinkCode,
    foods: payload.foods.map((f) => ({
      foodId: f.foodId,
      quantity: f.quantity,
      notes: f.notes ?? undefined,
      foodToppingIds: f.foodToppingIds ?? undefined,
    })),
  });

  return res.data;
}

export async function getCustomerOrders() {
  const res = await api.get<
    ApiResponse<CustomerOrderSummary[]> | CustomerOrderSummary[]
  >("/orders/mine");
  const orders = Array.isArray(res.data) ? res.data : (res.data.data ?? []);

  return orders.map(normalizeCustomerOrder);
}

function unwrapApiResponse<T>(payload: T | ApiResponse<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload as T;
}

type RawCustomerOrderSummary = CustomerOrderSummary & {
  id?: string | number;
};

export function getCustomerOrderId(
  order?: Partial<RawCustomerOrderSummary> | null,
) {
  return normalizeOrderId(
    order?.orderId ?? order?.id,
  );
}

function normalizeCustomerOrder(
  order: RawCustomerOrderSummary,
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
    id: orderId,
    orderId,
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
  const res = await api.get<
    | ApiResponse<
        | CustomerOrderDetailItem[]
        | { foods?: CustomerOrderDetailItem[] }
      >
    | CustomerOrderDetailItem[]
    | { foods?: CustomerOrderDetailItem[] }
  >(`/orders/${orderId}`);

  const payload = unwrapApiResponse(res.data) as
    | CustomerOrderDetailItem[]
    | { foods?: CustomerOrderDetailItem[] };

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.foods ?? [];
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

export async function confirmBill(orderId: string) {
  const res = await api.post<ApiResponse<null>>("/orders/bill/confirm", {
    orderId,
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
