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

  return (
    <aside className="onboarding-sidebar">
      <strong className="onboarding-brand">UGem Merchants</strong>

      <div className="onboarding-progress">
        <span>Onboarding</span>
        <small>65% Complete</small>
        <div>
          <i />
        </div>
      </div>

      <nav>
        {items.map(({ label, icon: Icon, active, disabled, path }) => (
          <button
            key={label}
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
            {label}
            {disabled && <em>UI</em>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
