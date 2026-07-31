import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

type Props = {
  images: string[];
  intervalMs?: number;
  onChange?: (...args: [number]) => void;
};

export function HeroCarousel({ images, intervalMs = 5000, onChange }: Props) {
  const [index, setIndex] = useState(0);

  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);

    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
      }
    };
  }, [images.length, intervalMs, onChange]);

  function restartTimer() {
    if (images.length <= 1) return;

    if (timer.current) {
      window.clearInterval(timer.current);
    }

    timer.current = window.setInterval(() => {
      setIndex((k) => (k + 1) % images.length);
    }, intervalMs);
  }

  function go(i: number) {
    const next = i % images.length;

    setIndex(next);
    restartTimer();

    onChange?.(next);
  }

  function next() {
    go((index + 1) % images.length);
  }

  function prev() {
    go((index - 1 + images.length) % images.length);
  }

  useEffect(() => {
    onChange?.(index);
  }, [index, onChange]);

  return (
    <div
      className="
        group relative h-full min-h-[52vh] w-full overflow-hidden
        rounded-[32px] bg-slate-950
        shadow-2xl shadow-cyan-950/25
      "
      aria-live="polite"
    >
      {/* slides */}
      {images.map((src, i) => (
        <div
          key={i}
          className={`
            absolute inset-0 bg-cover bg-center bg-no-repeat
            transition-all duration-1000 ease-out
            ${i === index ? "scale-100 opacity-100" : "scale-110 opacity-0"}
          `}
          style={{ backgroundImage: `url("${src}")` }}
          role="img"
          aria-hidden={i !== index}
        />
      ))}

      {/* cinematic overlays */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-950/80 via-slate-950/30 to-transparent" />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/75 via-transparent to-transparent" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_34%)]" />

      {/* glow */}
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

      {/* floating label */}
      <div
        className="
          absolute left-5 top-5 z-20
          inline-flex items-center gap-2
          rounded-full border border-white/20
          bg-white/10 px-4 py-2
          text-xs font-black uppercase tracking-[0.18em]
          text-white backdrop-blur-xl
        "
      >
        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
        UGem Experience
      </div>

      {/* content overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8 lg:p-10">
        <div className="max-w-xl">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200 backdrop-blur">
            Merchant Platform
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Quản lý Merchant hiện đại & trực quan
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-7 text-white/80 sm:text-base">
            Dashboard vận hành hồ sơ, kiểm duyệt merchant và theo dõi KPI Staff
            trong một trải nghiệm UI cao cấp.
          </p>
        </div>
      </div>

      {/* navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="
              absolute left-4 top-1/2 z-20
              hidden h-12 w-12 -translate-y-1/2
              place-items-center rounded-2xl
              border border-white/15 bg-white/10
              text-white backdrop-blur-xl
              transition-all duration-300
              hover:scale-105 hover:bg-white/20
            "
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            aria-label="Next slide"
            className="
              absolute right-4 top-1/2 z-20
              hidden h-12 w-12 -translate-y-1/2
              place-items-center rounded-2xl
              border border-white/15 bg-white/10
              text-white backdrop-blur-xl
              transition-all duration-300
              hover:scale-105 hover:bg-white/20
            "
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* progress + dots */}
      {images.length > 1 && (
        <div
          className="
            absolute bottom-6 left-1/2 z-20
            -translate-x-1/2
            rounded-full border border-white/15
            bg-white/10 px-4 py-3
            shadow-xl shadow-black/20
            backdrop-blur-2xl
          "
        >
          <div className="flex items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`
                  relative overflow-hidden rounded-full
                  transition-all duration-300
                  ${
                    i === index
                      ? "h-2.5 w-9 bg-cyan-400"
                      : "h-2.5 w-2.5 bg-white/50 hover:bg-white"
                  }
                `}
              >
                {i === index && (
                  <span
                    className="
                      absolute inset-0 animate-pulse
                      bg-white/30
                    "
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroCarousel;
