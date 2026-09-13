import { toast, type ExternalToast } from "sonner";
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

function renderDescription(description?: ReactNode | (() => ReactNode)) {
  if (!description) return null;
  if (typeof description === "function") {
    return (
      <div className="mt-1 text-xs text-slate-300 font-normal leading-relaxed break-words">
        {description()}
      </div>
    );
  }
  if (typeof description === "string" || typeof description === "number") {
    return (
      <p className="mt-1 text-xs text-slate-300 font-normal leading-relaxed break-words">
        {description}
      </p>
    );
  }
  return (
    <div className="mt-1 text-xs text-slate-300 font-normal leading-relaxed break-words">
      {description}
    </div>
  );
}

export function showSuccessToast(message: string, options?: ExternalToast) {
  const { description, ...restOptions } = options ?? {};
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-start gap-3.5 w-full min-w-[340px] max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xs mt-0.5">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-snug text-white">
            {message}
          </p>
          {renderDescription(description)}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mt-0.5"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 4000, ...restOptions }
  );
}

export function showErrorToast(message: string, options?: ExternalToast) {
  const { description, ...restOptions } = options ?? {};
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-start gap-3.5 w-full min-w-[340px] max-w-md rounded-2xl border border-rose-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-rose-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-xs mt-0.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-snug text-white">
            {message}
          </p>
          {renderDescription(description)}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mt-0.5"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 5000, ...restOptions }
  );
}

export function showInfoToast(message: string, options?: ExternalToast) {
  const { description, ...restOptions } = options ?? {};
  return toast.custom(
    (t) => (
      <div className="pointer-events-auto flex items-start gap-3.5 w-full min-w-[340px] max-w-md rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-cyan-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-xs mt-0.5">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-snug text-white">
            {message}
          </p>
          {renderDescription(description)}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mt-0.5"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { position: "bottom-right", duration: 4000, ...restOptions }
  );
}

export function showLoadingToast(message: string, options?: ExternalToast) {
  const { description, ...restOptions } = options ?? {};
  return toast.custom(
    () => (
      <div className="pointer-events-auto flex items-start gap-3.5 w-full min-w-[340px] max-w-md rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl text-white ring-1 ring-cyan-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-xs mt-0.5">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-snug text-white">
            {message}
          </p>
          {renderDescription(description)}
        </div>
      </div>
    ),
    { position: "bottom-right", duration: Infinity, ...restOptions }
  );
}
