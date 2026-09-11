import { PanelLeft, PanelLeftClose } from "lucide-react";

export function SidebarToggle({ collapsed, onToggle }: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const label = collapsed ? "Mở rộng" : "Thu gọn";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${label} sidebar`}
      aria-label={`${label} sidebar`}
      aria-expanded={!collapsed}
      className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300/30 bg-slate-500/10 text-xs font-bold text-inherit transition hover:bg-slate-500/20 focus-visible:outline-2 focus-visible:outline-cyan-500"
    >
      {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      {!collapsed && <span>Thu gọn</span>}
    </button>
  );
}
