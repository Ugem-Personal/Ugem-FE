import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Link2, LogOut, UserRound } from "lucide-react";

import { clearAuth, getCurrentUser } from "@/features/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { ModeToggle } from "@/shared/components/ModeToggle";
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
        "flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1.5 shadow-xs backdrop-blur-md transition duration-200 hover:border-cyan-300 dark:hover:border-cyan-500/50 sm:px-3.5",
        className,
      )}
    >
      <NotificationBellMenu />
      <ModeToggle />

      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-black text-white shadow-md ring-2 ring-cyan-400/30">
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

      <div className="hidden min-w-0 xl:block">
        <p className="max-w-[190px] truncate text-sm font-black leading-snug text-slate-950 dark:text-white sm:max-w-[220px]">
          {displayName}
        </p>

        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
          {email ? (
            <span className="max-w-[150px] truncate text-xs font-semibold leading-none text-slate-500 dark:text-slate-400 sm:max-w-[190px]">
              {email}
            </span>
          ) : null}

          {roleChips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black leading-none border",
                chip.tone === "reviewer"
                  ? "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                  : "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
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
          className="hidden h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-black hover:border-cyan-400 dark:hover:border-cyan-500 lg:inline-flex"
        >
          <Link to="/staff/profile">
            <UserRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
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
          className="hidden h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-black hover:border-cyan-400 dark:hover:border-cyan-500 lg:inline-flex"
        >
          <Link to="/merchant/profile">
            <UserRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
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
          className="hidden h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-black hover:border-cyan-400 dark:hover:border-cyan-500 lg:inline-flex"
        >
          <Link to="/admin/dashboard">
            <UserRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
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
          className="hidden h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-black hover:border-cyan-400 dark:hover:border-cyan-500 lg:inline-flex"
        >
          <Link to="/customer/profile">
            <UserRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
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
          className="hidden h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-black hover:border-cyan-400 dark:hover:border-cyan-500 lg:inline-flex"
        >
          <Link to="/affiliate-links">
            <Link2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            Affiliate
          </Link>
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="h-10 w-10 shrink-0 gap-1.5 rounded-xl border-slate-200 dark:border-white/10 p-0 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 2xl:w-auto 2xl:px-3.5"
        aria-label="Đăng xuất"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden 2xl:inline">Đăng xuất</span>
      </Button>
    </div>
  );
}
