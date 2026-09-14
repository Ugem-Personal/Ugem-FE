export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Delivering"
  | "Rejected"
  | "Completed"
  | "NotReceived"
  | "Cancelled";

export type MerchantOrderAction = {
  nextStatus: "Preparing" | "Ready" | "Delivering";
  label: string;
  successMessage: string;
};

const statusLabels: Record<OrderStatus, string> = {
  Pending: "Chờ xác nhận",
  Accepted: "Đang chuẩn bị",
  Preparing: "Đang chuẩn bị",
  Ready: "Đã lên món",
  Delivering: "Đang phục vụ",
  Rejected: "Đã từ chối",
  Completed: "Hoàn tất bữa ăn",
  NotReceived: "Khách báo chưa nhận",
  Cancelled: "Đã hủy",
};

export function normalizeOrderStatus(status?: string | null) {
  return status?.trim().toLowerCase() ?? "";
}

export function getOrderStatusLabel(status?: string | null) {
  const match = Object.keys(statusLabels).find(
    (candidate) => candidate.toLowerCase() === normalizeOrderStatus(status),
  ) as OrderStatus | undefined;

  return match ? statusLabels[match] : status || "Chưa xác định";
}

export function getMerchantOrderAction(
  status?: string | null,
  orderType?: string | null,
): MerchantOrderAction | null {
  const statusKey = normalizeOrderStatus(status);

  if (statusKey === "accepted" || statusKey === "preparing") {
    return {
      nextStatus: "Ready",
      label: "Đã lên món",
      successMessage: "Đã cập nhật: Món đã lên bàn cho khách.",
    };
  }

  if (
    statusKey === "ready" &&
    orderType?.trim().toLowerCase() === "online"
  ) {
    return {
      nextStatus: "Delivering",
      label: "Phục vụ món",
      successMessage: "Đơn đã chuyển sang trạng thái đang phục vụ.",
    };
  }

  return null;
}

export function isCustomerConfirmationReady(
  status?: string | null,
  orderType?: string | null,
) {
  const statusKey = normalizeOrderStatus(status);
  const orderTypeKey = orderType?.trim().toLowerCase();

  if (statusKey === "billconfirmed" || statusKey === "cashpending") {
    return true;
  }

  return orderTypeKey === "offline"
    ? statusKey === "ready" || statusKey === "delivering"
    : statusKey === "delivering";
}

export function getCustomerOrderProgressMessage(
  status?: string | null,
  _orderType?: string | null,
) {
  const statusKey = normalizeOrderStatus(status);

  if (!statusKey || statusKey === "pending") {
    return "Đơn đang chờ quán xác nhận.";
  }

  if (statusKey === "accepted" || statusKey === "preparing") {
    return "Quán đã tiếp nhận và đang chuẩn bị món cho bạn.";
  }

  if (statusKey === "ready" || statusKey === "delivering") {
    return "Món đã được phục vụ tại bàn. Chúc bạn dùng bữa ngon miệng!";
  }

  if (statusKey === "rejected") {
    return "Đơn đã bị quán từ chối.";
  }

  if (statusKey === "completed") {
    return "Bữa ăn đã hoàn tất. Cảm ơn bạn đã sử dụng dịch vụ!";
  }

  if (statusKey === "notreceived") {
    return "Bạn đã báo chưa nhận được đơn hàng này.";
  }

  if (statusKey === "cancelled") {
    return "Đơn hàng đã bị hủy.";
  }

  return "Trạng thái đơn hàng vừa được cập nhật.";
}
