import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, type UserRole } from "@/features/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const user = getCurrentUser();
  const location = useLocation();

  // Not logged in
  if (!user) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  // Check role if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.Role || "";
    const reviewerCanUseCustomerRoute =
      role === "Reviewer" && allowedRoles.includes("Customer");

    if (!allowedRoles.includes(role) && !reviewerCanUseCustomerRoute) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
