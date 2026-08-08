import type { ComponentType } from "react";
import {
  BadgeCheck,
  Bell,
  CreditCard,
  FileCheck2,
  Flag,
  ReceiptText,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  UserCog,
  WalletCards,
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import type { NotificationItem } from "./services";

export type NotificationTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

export type NotificationCategory =
  | "order"
  | "merchant-application"
  | "reviewer-application"
  | "review"
  | "staff"
  | "affiliate"
  | "campaign"
  | "system"
  | "general";

export type NotificationMeta = {
  actionLabel: string;
  actionTo?: string;
  category: NotificationCategory;
  categoryLabel: string;
  icon: ComponentType<{ className?: string }>;
  tone: NotificationTone;
};

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function getRoleHome(role?: string) {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Staff") return "/staff/dashboard";
  if (role === "Merchant") return "/merchant";
  if (role === "Customer") return "/customer";
  return "/";
}

function resolveActionTo(category: NotificationCategory, text: string) {
  const role = getCurrentUser()?.Role;
  const explicitRoute = getExplicitRouteFromText(text);

  if (explicitRoute) return explicitRoute;

  if (category === "order") {
    return role === "Merchant" ? "/merchant/orders" : "/customer/orders";
  }

  if (category === "merchant-application") {
    if (role === "Admin") return "/admin/applications";
    if (role === "Staff") return "/staff/applications";
    return "/merchant/application/status";
  }

  if (category === "reviewer-application") {
    if (role === "Admin") return "/admin/reviewer-applications";
    if (role === "Staff") return "/staff/reviewer-applications";
    if (role === "Reviewer") return "/affiliate-links";
    return "/customer/profile";
  }

  if (category === "review") return "/reviews";
  if (category === "staff") return "/admin/staff";
  if (category === "affiliate") return "/affiliate-links";
  if (category === "system") return getRoleHome(role);

  return undefined;
}

function getReference(item: NotificationItem) {
  const metadata = item.metadata ?? {};
  return {
    id:
      item.referenceId ??
      (typeof metadata.referenceId === "string" ? metadata.referenceId : null),
    type:
      item.referenceType ??
      (typeof metadata.referenceType === "string"
        ? metadata.referenceType
        : null),
  };
}

function resolveReferenceAction(item: NotificationItem) {
  const role = getCurrentUser()?.Role;
  const reference = getReference(item);

  if (reference.type === "Order" && reference.id) {
    return role === "Merchant"
      ? "/merchant/orders"
      : `/customer/orders/${reference.id}`;
  }

  if (reference.type === "Application" && reference.id) {
    if (role === "Admin") return `/admin/applications/${reference.id}`;
    if (role === "Staff") return `/staff/applications/${reference.id}`;
    return "/merchant/application/status";
  }

  if (reference.type === "ReviewerApplication") {
    if (role === "Admin") return "/admin/reviewer-applications";
    if (role === "Staff") return "/staff/reviewer-applications";
    if (role === "Reviewer") return "/affiliate-links";
    return "/customer/profile";
  }

  if (reference.type === "Merchant" && reference.id) {
    return role === "Merchant"
      ? "/merchant"
      : `/customer/merchants/${reference.id}`;
  }

  if (reference.type === "Review") return "/reviews";
  if (reference.type === "Staff") {
    return role === "Admin" ? "/admin/staff" : "/staff/profile";
  }

  return null;
}

function getExplicitRouteFromText(text: string) {
  const match = text.match(/\/(?:admin|staff|merchant|customer|notifications|reviews|affiliate-links)[^\s)]*/i);
  return match?.[0];
}

export function getNotificationBody(item: NotificationItem) {
  return item.message || "";
}

export function getNotificationText(item: NotificationItem) {
  return `${item.type ?? ""} ${item.title ?? ""} ${getNotificationBody(
    item,
  )}`.toLowerCase();
}

export function getNotificationTitle(item: NotificationItem) {
  const rawTitle = item.title || "Thông báo";
  const text = getNotificationText(item);

  if (
    includesAny(text, [
      "merchant application",
      "application has been approved",
      "hồ sơ merchant",
      "hồ sơ đăng ký quán",
    ])
  ) {
    if (includesAny(text, ["approved", "duyệt"])) {
      return "Hồ sơ merchant được duyệt";
    }
    if (includesAny(text, ["reject", "từ chối"])) {
      return "Hồ sơ merchant bị từ chối";
    }
    if (includesAny(text, ["new merchant", "resubmitted", "pending"])) {
      return "Có hồ sơ merchant chờ duyệt";
    }
  }

  if (includesAny(text, ["reviewer application", "đăng ký reviewer"])) {
    if (includesAny(text, ["approved", "duyệt"])) {
      return "Hồ sơ Reviewer được duyệt";
    }
    if (includesAny(text, ["rejected", "từ chối"])) {
      return "Hồ sơ Reviewer bị từ chối";
    }
    return "Có đơn Reviewer chờ duyệt";
  }

  if (includesAny(text, ["bill updated"])) return "Merchant cập nhật bill";
  if (includesAny(text, ["bill confirmed"])) return "Customer xác nhận bill";
  if (includesAny(text, ["bill rejected"])) return "Customer từ chối bill";
  if (includesAny(text, ["cash payment requested"])) {
    return "Thanh toán tiền mặt chờ xác nhận";
  }
  if (includesAny(text, ["cash payment", "confirmed"])) {
    return "Merchant xác nhận thanh toán tiền mặt";
  }
  if (includesAny(text, ["order issue", "not received"])) {
    return "Đơn có vấn đề";
  }
  if (includesAny(text, ["order completed"])) return "Đơn hoàn tất";
  if (includesAny(text, ["new review received"])) return "Customer đánh giá quán";
  if (includesAny(text, ["review updated"])) return "Customer cập nhật đánh giá";
  if (includesAny(text, ["staff account created"])) return "Staff mới được tạo";
  if (includesAny(text, ["staff account deactivated"])) return "Staff bị vô hiệu hóa";
  if (includesAny(text, ["commission"])) return "Commission affiliate";

  return rawTitle;
}

export function getNotificationMeta(item: NotificationItem): NotificationMeta {
  const text = getNotificationText(item);
  const explicitType = item.type?.toLowerCase() ?? "";
  const referenceType = getReference(item).type;

  let category: NotificationCategory = "general";
  let categoryLabel = "Thông báo";
  let icon: NotificationMeta["icon"] = Bell;
  let tone: NotificationTone = "cyan";

  if (
    referenceType === "Application" ||
    explicitType.includes("merchantapplication") ||
    includesAny(text, ["merchant application", "application has been approved", "application has been reject"])
  ) {
    category = "merchant-application";
    categoryLabel = "Merchant application";
    icon = Store;
    tone = includesAny(text, ["reject", "từ chối"]) ? "rose" : "emerald";
  } else if (
    referenceType === "ReviewerApplication" ||
    explicitType.includes("reviewerapplication") ||
    includesAny(text, ["reviewer application"])
  ) {
    category = "reviewer-application";
    categoryLabel = "Reviewer application";
    icon = FileCheck2;
    tone = includesAny(text, ["reject", "từ chối"]) ? "rose" : "violet";
  } else if (explicitType.includes("order") || includesAny(text, ["order", "bill", "cash payment"])) {
    category = "order";
    categoryLabel = "Đơn hàng";
    icon = ShoppingBag;
    tone = "cyan";

    if (includesAny(text, ["issue", "rejected", "not received", "expired", "failed"])) {
      icon = ShieldAlert;
      tone = "amber";
    } else if (includesAny(text, ["completed", "confirmed"])) {
      icon = BadgeCheck;
      tone = "emerald";
    } else if (includesAny(text, ["bill"])) {
      icon = ReceiptText;
      tone = "cyan";
    } else if (includesAny(text, ["cash payment"])) {
      icon = CreditCard;
      tone = "amber";
    }
  } else if (explicitType.includes("review") || includesAny(text, ["review"])) {
    category = "review";
    categoryLabel = "Đánh giá";
    icon = Star;
    tone = "amber";
  } else if (
    referenceType === "Staff" ||
    explicitType.includes("staff") ||
    includesAny(text, ["staff account", "tài khoản staff"])
  ) {
    category = "staff";
    categoryLabel = "Staff";
    icon = UserCog;
    tone = "slate";
  } else if (includesAny(text, ["affiliate", "commission"])) {
    category = "affiliate";
    categoryLabel = "Affiliate";
    icon = WalletCards;
    tone = "emerald";
  } else if (includesAny(text, ["campaign", "ưu đãi", "khuyến mãi"])) {
    category = "campaign";
    categoryLabel = "Ưu đãi";
    icon = BadgeCheck;
    tone = "violet";
  } else if (includesAny(text, ["report", "warning", "alert", "system"])) {
    category = "system";
    categoryLabel = "Hệ thống";
    icon = Flag;
    tone = "rose";
  }

  const actionTo =
    resolveReferenceAction(item) || item.actionUrl || resolveActionTo(category, text);

  return {
    actionLabel: getActionLabel(category),
    actionTo,
    category,
    categoryLabel,
    icon,
    tone,
  };
}

function getActionLabel(category: NotificationCategory) {
  if (category === "order") return "Xem đơn hàng";
  if (category === "merchant-application") return "Xem hồ sơ merchant";
  if (category === "reviewer-application") return "Xem đơn Reviewer";
  if (category === "review") return "Xem đánh giá";
  if (category === "staff") return "Xem Staff";
  if (category === "affiliate") return "Xem affiliate";
  if (category === "campaign") return "Xem ưu đãi";
  if (category === "system") return "Xem chi tiết";
  return "Mở";
}

export function getToneClasses(tone: NotificationTone) {
  if (tone === "emerald") {
    return {
      badge: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
      border: "border-emerald-200 dark:border-emerald-800/60",
      icon: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
      panel: "bg-emerald-50/70 dark:bg-emerald-950/40",
    };
  }

  if (tone === "amber") {
    return {
      badge: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
      border: "border-amber-200 dark:border-amber-800/60",
      icon: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
      panel: "bg-amber-50/70 dark:bg-amber-950/40",
    };
  }

  if (tone === "rose") {
    return {
      badge: "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
      border: "border-rose-200 dark:border-rose-800/60",
      icon: "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
      panel: "bg-rose-50/70 dark:bg-rose-950/40",
    };
  }

  if (tone === "violet") {
    return {
      badge: "bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
      border: "border-violet-200 dark:border-violet-800/60",
      icon: "bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
      panel: "bg-violet-50/70 dark:bg-violet-950/40",
    };
  }

  if (tone === "slate") {
    return {
      badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700",
      border: "border-slate-200 dark:border-slate-800",
      icon: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700",
      panel: "bg-slate-50 dark:bg-slate-900/60",
    };
  }

  return {
    badge: "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-800",
    border: "border-cyan-200 dark:border-cyan-800/60",
    icon: "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-800",
    panel: "bg-cyan-50/70 dark:bg-cyan-950/40",
  };
}

export function formatNotificationTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
