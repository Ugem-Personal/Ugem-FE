import { AdminShell } from "@/features/admin/components/AdminShell";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import RouteErrorPage from "@/app/RouteErrorPage";
import RouteLoadingBoundary from "@/app/RouteLoadingBoundary";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, type ComponentType } from "react";

const lazyNamed = <T extends ComponentType<Record<string, unknown>>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string,
) => lazy(async () => ({ default: (await loader())[exportName] }));

const AdminStaffPage = lazy(
  () => import("@/features/admin/pages/AdminStaffPage"),
);
const AdminDashboardPage = lazy(
  () => import("@/features/admin/pages/AdminDashboardPage"),
);
const AdminAuditLogsPage = lazy(
  () => import("@/features/admin/pages/AdminAuditLogsPage"),
);
const AdminApplicationsPage = lazy(
  () => import("@/features/admin/pages/AdminApplicationsPage"),
);
const AdminApplicationDetailPage = lazy(
  () => import("@/features/admin/pages/AdminApplicationDetailPage"),
);
const StaffReviewerApplicationsPage = lazy(
  () => import("@/features/admin/pages/StaffReviewerApplicationsPage"),
);
const StaffApplicationDetailPage = lazy(
  () => import("@/features/admin/pages/StaffApplicationDetailPage"),
);
const StaffApplicationsPage = lazy(
  () => import("@/features/admin/pages/StaffApplicationsPage"),
);
const StaffProfilePage = lazy(
  () => import("@/features/admin/pages/StaffProfilePage"),
);
const StaffMerchantsPage = lazy(
  () => import("@/features/admin/pages/StaffMerchantsPage"),
);
const StaffUserProfilePage = lazy(
  () => import("@/features/admin/pages/StaffUserProfilePage"),
);
const AffiliateLinkPage = lazy(
  () => import("@/features/affiliateLink/pages/AffiliateLinkPage"),
);
const AffiliateRedirectPage = lazy(
  () => import("@/features/affiliateLink/pages/AffiliateRedirectPage"),
);
const LoginPage = lazyNamed(
  () => import("@/features/auth/pages/LoginPage"),
  "LoginPage",
);
const RegisterPage = lazyNamed(
  () => import("@/features/auth/pages/RegisterPage"),
  "RegisterPage",
);
const ForgotPasswordPage = lazyNamed(
  () => import("@/features/auth/pages/ForgotPasswordPage"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyNamed(
  () => import("@/features/auth/pages/ResetPasswordPage"),
  "ResetPasswordPage",
);
const CheckInPage = lazy(() => import("@/shared/pages/CheckInPage"));
const CustomerHomePage = lazy(
  () => import("@/features/customer/pages/CustomerHomePage"),
);
const GuestExplorePage = lazy(
  () => import("@/features/customer/pages/GuestExplorePage"),
);
const CustomerOrderDetailPage = lazy(
  () => import("@/features/customer/pages/CustomerOrderDetailPage"),
);
const CustomerOrdersPage = lazy(
  () => import("@/features/customer/pages/CustomerOrdersPage"),
);
const CustomerProfilePage = lazy(
  () => import("@/features/customer/pages/CustomerProfilePage"),
);
const MerchantDetailPage = lazy(
  () => import("@/features/customer/pages/MerchantDetailPage"),
);
const WishlistPage = lazy(
  () => import("@/features/customer/pages/WishlistPage"),
);
const ConfirmBillPage = lazy(
  () => import("@/features/customer/pages/ConfirmBillPage"),
);
const MerchantApplicationStatusPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantApplicationStatusPage"),
  "MerchantApplicationStatusPage",
);
const MerchantCampaignPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantCampaignPage"),
  "MerchantCampaignPage",
);
const MerchantFoodsPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantFoodsPage"),
  "MerchantFoodsPage",
);
const MerchantOnboardingPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantOnboardingPage"),
  "MerchantOnboardingPage",
);
const MerchantPortalPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantPortalPage"),
  "MerchantPortalPage",
);
const MerchantRestaurantPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantRestaurantPage"),
  "MerchantRestaurantPage",
);
const MerchantViewStatisticsPage = lazyNamed(
  () => import("@/features/merchantPortal/pages/MerchantViewStatisticsPage"),
  "MerchantViewStatisticsPage",
);
const MerchantOrdersPage = lazy(
  () => import("@/features/merchantPortal/pages/MerchantOrdersPage"),
);
const MerchantCreateOrderPage = lazy(
  () => import("@/features/merchantPortal/pages/MerchantCreateOrderPage"),
);
const MerchantProfilePage = lazy(
  () => import("@/features/merchantPortal/pages/MerchantProfilePage"),
);
const NotificationsPage = lazy(
  () => import("@/features/notifications/pages/NotificationsPage"),
);
const ReviewsPage = lazy(() => import("@/features/review/pages/ReviewsPage"));
const VietMapDemoPage = lazy(() => import("@/shared/pages/VietMapDemoPage"));
const UnauthorizedPage = lazy(() => import("@/shared/pages/UnauthorizedPage"));
const NotFoundPage = lazyNamed(
  () => import("@/shared/pages/NotFoundPage"),
  "NotFoundPage",
);

const routers = createBrowserRouter([
  {
    path: "/",
    element: <RouteLoadingBoundary />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/explore",
        element: <GuestExplorePage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "/check-in",
        element: <CheckInPage />,
      },
      {
        path: "/orders/confirm",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <ConfirmBillPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/unauthorized",
        element: <UnauthorizedPage />,
      },
      {
        path: "/customer",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <CustomerHomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customer/profile",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <CustomerProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customer/merchants/:id",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <MerchantDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/:id",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <MerchantDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customer/wishlist",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <WishlistPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customer/orders",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <CustomerOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customer/orders/:id",
        element: (
          <ProtectedRoute allowedRoles={["Customer", "Reviewer"]}>
            <CustomerOrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantPortalPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/restaurant",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantRestaurantPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/profile",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/application/create",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantOnboardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/application/status",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantApplicationStatusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/orders",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/create-order",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantCreateOrderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/foods",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantFoodsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/campaigns",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantCampaignPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/merchant/view-statistics",
        element: (
          <ProtectedRoute allowedRoles={["Merchant"]}>
            <MerchantViewStatisticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff",
        element: <Navigate to="/staff/dashboard" replace />,
      },
      {
        path: "/staff/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/applications",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffApplicationsPage tab="pending" />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/applications/pending",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffApplicationsPage tab="pending" />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/applications/approved",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffApplicationsPage tab="reviewed" />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/applications/:id",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffApplicationDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/profile",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffUserProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/merchants",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffMerchantsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/staff/reviewer-applications",
        element: (
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffReviewerApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <AdminDashboardPage />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/staff",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <AdminStaffPage />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/applications",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <AdminApplicationsPage
                basePath="/admin/applications"
                title="Hồ sơ merchant"
                subtitle="Theo dõi và xử lý hồ sơ merchant trong hệ thống."
                fallbackName="Admin"
                canReview
              />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/applications/:id",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <AdminApplicationDetailPage
                basePath="/admin/applications"
                fallbackName="Admin"
                canReview
              />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/reviewer-applications",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <StaffReviewerApplicationsPage
                shell="admin"
                fallbackName="Admin"
                canReview={false}
              />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/audit-logs",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <AdminAuditLogsPage />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/notifications",
        element: (
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminShell>
              <NotificationsPage />
            </AdminShell>
          </ProtectedRoute>
        ),
      },
      {
        path: "/notifications",
        element: (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/reviews",
        element: (
          <ProtectedRoute>
            <ReviewsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/affiliate-links",
        element: (
          <ProtectedRoute allowedRoles={["Reviewer"]}>
            <AffiliateLinkPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/r/:linkCode",
        element: <AffiliateRedirectPage />,
      },
      {
        path: "/map-demo",
        element: <VietMapDemoPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default routers;
