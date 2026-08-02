import { useState, useMemo } from "react";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
};

const FALLBACK_GRADIENTS = [
  "from-slate-900 via-cyan-950 to-teal-900",
  "from-slate-900 via-indigo-950 to-blue-900",
  "from-slate-900 via-emerald-950 to-cyan-900",
  "from-slate-900 via-rose-950 to-amber-900",
];

export function ImageWithFallback({
  src,
  alt,
  className,
  containerClassName,
  fallbackIcon,
  fallbackText,
}: ImageWithFallbackProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cleanSrc = src?.trim() || "";

  const initials = useMemo(() => {
    if (fallbackText) return fallbackText;
    const parts = alt.trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase() || "UG"
    );
  }, [alt, fallbackText]);

  const gradientIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < alt.length; i++) {
      hash = alt.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % FALLBACK_GRADIENTS.length;
  }, [alt]);

  if (!cleanSrc || error) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-1.5 overflow-hidden bg-gradient-to-br p-3 text-center text-white shadow-inner",
          FALLBACK_GRADIENTS[gradientIndex],
          containerClassName,
        )}
        aria-label={alt}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md">
          {fallbackIcon || <Store className="h-5 w-5 text-cyan-300" />}
        </div>
        <span className="text-xs font-black tracking-widest uppercase text-white/90">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900",
        containerClassName,
      )}
    >
      {loading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-slate-200 dark:bg-slate-800" />
      )}
      <img
        src={cleanSrc}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

export default ImageWithFallback;
