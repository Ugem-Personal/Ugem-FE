import { clearAuth, getCurrentUser } from "../../../features/auth";
import { NotificationBellMenu } from "../../components/NotificationBellMenu";
import { notify } from "../../lib/notify";

export function OnboardingTopbar() {
  const user = getCurrentUser();

  function logout() {
    notify.confirmLogout(() => {
      clearAuth();
      window.location.href = "/login";
    });
  }

  return (
    <header className="onboarding-topbar">
      <nav>
        <button type="button">Dashboard</button>
        <button type="button">Listings</button>
        <button type="button">Insights</button>
      </nav>

      <div className="onboarding-user">
        <NotificationBellMenu />
        <div className="onboarding-avatar">
          {(user?.Email || "M").charAt(0).toUpperCase()}
        </div>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
