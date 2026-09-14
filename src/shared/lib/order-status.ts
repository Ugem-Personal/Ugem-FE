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
  Ready: "Đang chuẩn bị",
  Delivering: "Đang phục vụ",
  Rejected: "Đã từ chối",
  Completed: "Hoàn thành",
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

  if (statusKey === "accepted") {
    return {
      nextStatus: "Preparing",
      label: "Bắt đầu chuẩn bị",
      successMessage: "Đơn đã chuyển sang bước chuẩn bị.",
    };
  }

  if (statusKey === "preparing") {
    return {
      nextStatus: "Ready",
      label: "Đánh dấu đã sẵn sàng",
      successMessage: "Món đã sẵn sàng phục vụ tại quán.",
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
    ? statusKey === "accepted" ||
        statusKey === "preparing" ||
        statusKey === "ready"
    : statusKey === "delivering";
}

export function getCustomerOrderProgressMessage(
  status?: string | null,
  orderType?: string | null,
) {
  const statusKey = normalizeOrderStatus(status);

  if (!statusKey || statusKey === "pending") {
    return "Đơn đang chờ quán xác nhận.";
  }

  if (statusKey === "accepted") {
    return "Quán đã nhận đơn và sẽ bắt đầu chuẩn bị ngay.";
  }

  if (statusKey === "preparing") {
    return "Quán đang chuẩn bị món cho bạn.";
  }

  if (statusKey === "ready") {
    return orderType?.trim().toLowerCase() === "offline"
      ? "Quán đang chuẩn bị món. Bạn có thể kiểm tra bill và thanh toán."
      : "Quán đang chuẩn bị món cho bạn.";
  }

  if (statusKey === "delivering") {
    return "Quán đang phục vụ món. Hãy xác nhận sau khi bạn nhận đủ món.";
  }

  if (statusKey === "rejected") {
    return "Đơn đã bị quán từ chối.";
  }

  if (statusKey === "completed") {
    return "Bạn đã xác nhận hoàn tất đơn hàng này.";
  }

  if (statusKey === "notreceived") {
    return "Bạn đã báo chưa nhận được đơn hàng này.";
  }

  if (statusKey === "cancelled") {
    return "Đơn hàng đã bị hủy.";
  }

  return "Trạng thái đơn hàng vừa được cập nhật.";
}
