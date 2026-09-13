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
      className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-500"
    >
      {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      {!collapsed && <span>Thu gọn</span>}
    </button>
  );
}
