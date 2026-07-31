import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Link2, LogOut, UserRound } from "lucide-react";

import { clearAuth, getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { NotificationBellMenu } from "@/shared/components/NotificationBellMenu";
import { notify } from "@/shared/lib/notify";
import { getUserProfile, type UserProfile } from "@/shared/services";

type UserAccountMenuProps = {
  fallbackName: string;
  className?: string;
  avatarUrl?: string;
};

function getRoleLabel(role?: string) {
  if (role === "Customer") return "Customer";
  if (role === "Reviewer") return "Reviewer";
  if (role === "Merchant") return "Merchant";
  if (role === "Staff") return "Staff";
  if (role === "Admin") return "Admin";
  return role || "";
}

export function UserAccountMenu({
  fallbackName,
  className,
  avatarUrl: avatarUrlOverride,
}: UserAccountMenuProps) {
  const user = getCurrentUser();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const displayName =
    profile?.fullName || profile?.name || user?.Name || fallbackName;
  const email = profile?.email || user?.Email || "";
  const baseRoleLabel = getRoleLabel(profile?.role || user?.Role);
  const roleChips = baseRoleLabel
    ? [
        {
          label: baseRoleLabel,
          tone:
            baseRoleLabel === "Reviewer"
              ? ("reviewer" as const)
              : ("base" as const),
        },
      ]
    : [];
  const canUseAffiliate = user?.Role === "Reviewer";
  const isAffiliatePage = location.pathname === "/affiliate-links";
  const initial = (displayName || email || "U").trim().charAt(0).toUpperCase();
  const avatarUrl =
    avatarUrlOverride || profile?.avatarUrl || user?.AvatarUrl || "";

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const data = await getUserProfile();

        if (active) {
          setProfile(data ?? null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadProfile();

    const handleProfileUpdated = () => {
      void loadProfile();
    };

    window.addEventListener("ugem:profile-updated", handleProfileUpdated);

    return () => {
      active = false;
      window.removeEventListener("ugem:profile-updated", handleProfileUpdated);
    };
  }, []);

  function handleLogout() {
    notify.confirmLogout(() => {
      clearAuth();
      window.location.href = "/login";
    });
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border border-cyan-100/80 bg-white/90 px-3 py-2 shadow-lg shadow-cyan-950/5 ring-1 ring-cyan-950/5 backdrop-blur-xl",
        className,
      )}
    >
      <NotificationBellMenu />

      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 text-sm font-bold text-cyan-800">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      <div className="min-w-0">
        <p className="max-w-[190px] truncate text-sm font-black leading-5 text-slate-950 sm:max-w-[220px]">
          {displayName}
        </p>

        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
          {email ? (
            <span className="max-w-[150px] truncate text-xs font-medium leading-4 text-slate-500 sm:max-w-[190px]">
              {email}
            </span>
          ) : null}

          {roleChips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black leading-3 ring-1",
                chip.tone === "reviewer"
                  ? "bg-violet-50 text-violet-700 ring-violet-100"
                  : "bg-cyan-50 text-cyan-700 ring-cyan-100",
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {user?.Role === "Staff" ? (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
        >
          <Link to="/staff/profile">
            <UserRound className="h-3.5 w-3.5" />
            Profile
          </Link>
        </Button>
      ) : null}

      {user?.Role === "Merchant" ? (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
        >
          <Link to="/merchant/profile">
            <UserRound className="h-3.5 w-3.5" />
            Profile
          </Link>
        </Button>
      ) : null}

      {user?.Role === "Admin" ? (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
        >
          <Link to="/admin/dashboard">
            <UserRound className="h-3.5 w-3.5" />
            Profile
          </Link>
        </Button>
      ) : null}

      {user?.Role === "Customer" || user?.Role === "Reviewer" ? (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
        >
          <Link to="/customer/profile">
            <UserRound className="h-3.5 w-3.5" />
            Profile
          </Link>
        </Button>
      ) : null}

      {canUseAffiliate && !isAffiliatePage ? (
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
        >
          <Link to="/affiliate-links">
            <Link2 className="h-3.5 w-3.5" />
            Affiliate
          </Link>
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
      >
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </Button>
    </div>
  );
}
