import { toast, type ExternalToast } from "sonner";
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react";

export function showSuccessToast(message: string, options?: ExternalToast) {
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-center gap-3.5 w-full max-w-sm rounded-2xl border border-emerald-500/30 dark:border-emerald-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xs">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug text-slate-100">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 4000, ...options }
  );
}

export function showErrorToast(message: string, options?: ExternalToast) {
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-center gap-3.5 w-full max-w-sm rounded-2xl border border-rose-500/30 dark:border-rose-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-rose-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-xs">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug text-slate-100">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 5000, ...options }
  );
}

export function showInfoToast(message: string, options?: ExternalToast) {
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-center gap-3.5 w-full max-w-sm rounded-2xl border border-cyan-500/30 dark:border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-cyan-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-xs">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug text-slate-100">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 4000, ...options }
  );
}

export function showLoadingToast(message: string, options?: ExternalToast) {
  return toast.custom(
    () => (
      <div className="pointer-events-auto flex items-center gap-3.5 w-full max-w-sm rounded-2xl border border-cyan-500/30 dark:border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-cyan-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-xs">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug text-slate-100">
            {message}
          </p>
        </div>
      </div>
    ),
    { position: "bottom-right", duration: Infinity, ...options }
  );
}
