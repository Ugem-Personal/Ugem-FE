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
  MapPinned,
  MessageSquareText,
  QrCode,
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
    groupName: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", description: "Real-time platform overview", to: "/admin/dashboard", icon: LayoutDashboard },
      { key: "audit-logs", label: "Audit Logs", description: "System activity history", to: "/admin/audit-logs", icon: Clock3 },
    ],
  },
  {
    groupName: "People",
    items: [
      { key: "staff", label: "Staff", description: "Staff accounts and permissions", to: "/admin/staff", icon: Users },
    ],
  },
  {
    groupName: "Approvals",
    items: [
      { key: "applications", label: "Merchant Applications", description: "Review merchant onboarding", to: "/admin/applications", icon: CalendarPlus },
      { key: "reviewer-applications", label: "Reviewer Applications", description: "Review contributor accounts", to: "/admin/reviewer-applications", icon: FileCheck2 },
    ],
  },
];

export const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Staff Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", description: "Application processing overview", to: "/staff/dashboard", icon: LayoutDashboard },
      { key: "pending", label: "Pending Applications", description: "Applications waiting for review", to: "/staff/applications/pending", icon: Clock3 },
      { key: "approved", label: "Approved Applications", description: "Approval history", to: "/staff/applications/approved", icon: CheckCircle2 },
    ],
  },
  {
    groupName: "Partners",
    items: [
      { key: "merchants", label: "Merchants", description: "Search merchants", to: "/staff/merchants", icon: Store },
      { key: "reviewer-applications", label: "Reviewer Applications", description: "Review contributor accounts", to: "/staff/reviewer-applications", icon: UserCheck },
    ],
  },
  {
    groupName: "Account",
    items: [
      { key: "profile", label: "Staff Profile", description: "Personal information", to: "/staff/profile", icon: IdCard },
    ],
  },
];

// Primary Merchant navigation. Legacy Orders/POS routes remain reachable by URL
// but are intentionally excluded from the UFind Core MVP journey.
export const MERCHANT_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Merchant Core",
    items: [
      { key: "dashboard", label: "Dashboard", description: "Verified visits and contribution signals", to: "/merchant", icon: LayoutDashboard },
      { key: "restaurant", label: "Restaurant Profile", description: "Profile and location", to: "/merchant/restaurant", icon: Store },
      { key: "foods", label: "Menu", description: "Food and menu information", to: "/merchant/foods", icon: UtensilsCrossed },
      { key: "check-in", label: "Verified Check-in", description: "Verify physical visits", to: "/merchant/check-in", icon: QrCode },
      { key: "campaigns", label: "Campaigns", description: "Sponsored discovery and attribution", to: "/merchant/campaigns", icon: Tag },
      { key: "analytics", label: "Merchant Analytics", description: "Visits, reviews and PPVV preview", to: "/merchant/view-statistics", icon: BarChart3 },
    ],
  },
  {
    groupName: "Account",
    items: [
      { key: "profile", label: "Merchant Profile", description: "Account and security", to: "/merchant/profile", icon: UserRound },
    ],
  },
];

// Customer navigation follows Discover -> Map -> Saved -> Check-in -> Contributions.
// Customer Orders remains a compatibility route and is not a primary MVP entry.
export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { key: "explore", label: "Discover", to: "/explore", icon: Compass },
  { key: "map", label: "Map", to: "/explore", icon: MapPinned },
  { key: "wishlist", label: "Saved", to: "/customer/wishlist", icon: Heart },
  { key: "check-in", label: "Check-in", to: "/check-in", icon: QrCode },
  { key: "contributions", label: "Contributions", to: "/reviews", icon: MessageSquareText },
  { key: "profile", label: "Profile", to: "/customer/profile", icon: UserRound },
];
