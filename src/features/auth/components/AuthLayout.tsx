import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import HeroCarousel from "./HeroCarousel";
import { Logo } from "./Logo";
import { ModeToggle } from "@/shared/components/ModeToggle";

type AuthLayoutProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

const HERO_IMAGES = ["discovery", "merchant", "insights", "security"];

export function AuthLayout({
  eyebrow = "UGem Platform",
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  const [, setSlide] = useState(0);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex items-center justify-center p-3 sm:p-5 xl:p-6">
      {/* Background Decor Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-slate-950/0 to-transparent dark:from-cyan-500/5" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 grid min-h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:h-[calc(100dvh-3rem)] max-h-[960px] w-full max-w-[1420px] grid-cols-1 lg:grid-cols-[52%_48%] gap-5 xl:gap-6 items-stretch overflow-hidden">
        {/* Brand Hero Section (Left Column) */}
        <section className="relative hidden lg:flex lg:h-full lg:min-h-0 overflow-hidden rounded-[28px] shadow-2xl">
          <HeroCarousel images={HERO_IMAGES} intervalMs={4000} onChange={setSlide} />
        </section>

        {/* Auth Form Section (Right Column) */}
        <section className="relative flex flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-7 xl:p-9 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 w-full min-w-0">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top Header Controls */}
          <header className="relative z-10 flex w-full items-center justify-between gap-4 mb-3">
            <Link to="/explore" className="group flex items-center gap-2 hover:opacity-90 transition-opacity" title="Về trang Khám Phá UGem">
              <Logo />
            </Link>

            <div className="flex items-center gap-2.5">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/80 dark:hover:text-cyan-300 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                title="Khám phá các quán ăn ngon"
                aria-label="Khám phá quán"
              >
                <Compass className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Khám phá quán</span>
              </Link>
              <ModeToggle />
            </div>
          </header>

          {/* Main Form Content */}
          <div className="relative z-10 my-auto py-2 w-full max-w-[480px] mx-auto min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/80 dark:border-cyan-800/50 bg-cyan-50/90 dark:bg-cyan-950/60 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 mb-1.5">
              <span>{eyebrow}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl xl:text-3xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.15]">
              {title}
            </h1>

            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>

            <div className="mt-4 sm:mt-5">{children}</div>
          </div>

          {/* Footer info */}
          <footer className="relative z-10 w-full text-center pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} UGem Food Platform. Nền tảng Quản lý & Trải nghiệm Ẩm thực.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
