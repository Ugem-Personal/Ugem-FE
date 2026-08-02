import {
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Compass,
  FileCheck2,
  Heart,
  IdCard,
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  Store,
  Tag,
  UserCheck,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  key: string;
  label: string;
  description?: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  badgeCount?: number;
};

export type NavGroup = {
  groupName: string;
  items: NavItem[];
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Tổng Quan",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        description: "Báo cáo doanh thu real-time",
        to: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        key: "audit-logs",
        label: "Audit Logs",
        description: "Nhật ký hoạt động hệ thống",
        to: "/admin/audit-logs",
        icon: Clock3,
      },
    ],
  },
  {
    groupName: "Quản Lý Nhân Sự",
    items: [
      {
        key: "staff",
        label: "Nhân viên Staff",
        description: "Phân quyền và tài khoản Staff",
        to: "/admin/staff",
        icon: Users,
      },
    ],
  },
  {
    groupName: "Phê Duyệt Hồ Sơ",
    items: [
      {
        key: "applications",
        label: "Hồ sơ Merchant",
        description: "Thẩm định đăng ký quán ăn",
        to: "/admin/applications",
        icon: CalendarPlus,
      },
      {
        key: "reviewer-applications",
        label: "Đơn Reviewer",
        description: "Thẩm định reviewer/affiliate",
        to: "/admin/reviewer-applications",
        icon: FileCheck2,
      },
    ],
  },
];

export const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Workspace Staff",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        description: "KPI & Tốc độ xử lý hồ sơ",
        to: "/staff/dashboard",
        icon: LayoutDashboard,
      },
      {
        key: "pending",
        label: "Hồ sơ chờ duyệt",
        description: "Hàng chờ xử lý khẩn cấp",
        to: "/staff/applications/pending",
        icon: Clock3,
      },
      {
        key: "approved",
        label: "Hồ sơ đã duyệt",
        description: "Lịch sử phê duyệt",
        to: "/staff/applications/approved",
        icon: CheckCircle2,
      },
    ],
  },
  {
    groupName: "Thực Địa & Đối Tác",
    items: [
      {
        key: "merchants",
        label: "Danh Sách Merchant",
        description: "Tra cứu quán ăn hệ thống",
        to: "/staff/merchants",
        icon: Store,
      },
      {
        key: "reviewer-applications",
        label: "Đơn Reviewer",
        description: "Duyệt tài khoản Reviewer",
        to: "/staff/reviewer-applications",
        icon: UserCheck,
      },
    ],
  },
  {
    groupName: "Tài Khoản",
    items: [
      {
        key: "profile",
        label: "Profile Staff",
        description: "Thông tin cá nhân",
        to: "/staff/profile",
        icon: IdCard,
      },
    ],
  },
];

export const MERCHANT_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Cửa Hàng",
    items: [
      {
        key: "dashboard",
        label: "Tổng Quan",
        description: "Trạng thái vận hành",
        to: "/merchant",
        icon: LayoutDashboard,
      },
      {
        key: "restaurant",
        label: "Thông Tin Quán",
        description: "Hồ sơ & địa chỉ gian hàng",
        to: "/merchant/restaurant",
        icon: Store,
      },
      {
        key: "foods",
        label: "Thực Đơn Món Ăn",
        description: "Quản lý danh mục & món ăn",
        to: "/merchant/foods",
        icon: UtensilsCrossed,
      },
    ],
  },
  {
    groupName: "Đơn Hàng & Thống Kê",
    items: [
      {
        key: "orders",
        label: "Quản Lý Đơn Hàng",
        description: "Theo dõi & xử lý đơn hàng",
        to: "/merchant/orders",
        icon: ShoppingBag,
      },
      {
        key: "create-order",
        label: "Tạo Đơn Hàng Mới",
        description: "Tạo đơn tại chỗ cho khách",
        to: "/merchant/create-order",
        icon: PlusCircle,
      },
      {
        key: "statistics",
        label: "Thống Kê Doanh Số",
        description: "Báo cáo tăng trưởng",
        to: "/merchant/view-statistics",
        icon: BarChart3,
      },
    ],
  },
  {
    groupName: "Marketing & Tài Khoản",
    items: [
      {
        key: "campaigns",
        label: "Chiến Dịch Promotion",
        description: "Khuyến mãi & ưu đãi",
        to: "/merchant/campaigns",
        icon: Tag,
      },
      {
        key: "profile",
        label: "Hồ Sơ Chủ Quán",
        description: "Tài khoản & bảo mật",
        to: "/merchant/profile",
        icon: UserRound,
      },
    ],
  },
];

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  {
    key: "explore",
    label: "Khám Phá Quán",
    to: "/explore",
    icon: Compass,
  },
  {
    key: "orders",
    label: "Đơn Hàng Của Tôi",
    to: "/customer/orders",
    icon: ShoppingBag,
  },
  {
    key: "wishlist",
    label: "Quán Yêu Thích",
    to: "/customer/wishlist",
    icon: Heart,
  },
  {
    key: "profile",
    label: "Tài Khoản",
    to: "/customer/profile",
    icon: UserRound,
  },
];
