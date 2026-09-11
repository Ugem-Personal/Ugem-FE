import { useState } from "react";
import { SidebarToggle } from "@/shared/components/SidebarToggle";
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const items = [
  {
    label: "Business Info",
    icon: Building2,
    active: true,
    disabled: false,
    path: "/merchant/application/create",
  },
  {
    label: "Menu Details",
    icon: Utensils,
    active: false,
    disabled: false,
    path: "/merchant/application/create",
  },
  {
    label: "Application Status",
    icon: ClipboardCheck,
    active: false,
    disabled: false,
    path: "/merchant/application/status",
  },
  {
    label: "Rank Settings",
    icon: BookOpen,
    active: false,
    disabled: true,
    path: "",
  },
  {
    label: "Verification",
    icon: ShieldCheck,
    active: false,
    disabled: true,
    path: "",
  },
];

export function OnboardingSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="onboarding-sidebar" data-collapsed={collapsed}>
      <strong className="onboarding-brand">{collapsed ? "UG" : "UGem Merchants"}</strong>

      <div className="onboarding-progress" hidden={collapsed}>
        <span>Onboarding</span>
        <small>65% Complete</small>
        <div>
          <i />
        </div>
      </div>

      <nav>
        {items.map(({ label, icon: Icon, active, disabled, path }) => (
          <button
            key={label} title={label} aria-label={label}
            type="button"
            className={active ? "active" : ""}
            disabled={disabled}
            onClick={() => {
              if (!disabled && path) {
                navigate(path);
              }
            }}
          >
            <Icon size={17} />
            {!collapsed && label}
            {!collapsed && disabled && <em>UI</em>}
          </button>
        ))}
      </nav>
      <div className="mt-6"><SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} /></div>
    </aside>
  );
}
