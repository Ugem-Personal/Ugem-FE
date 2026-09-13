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
  eyebrow = "UFind Platform",
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  const [, setSlide] = useState(0);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 dark:bg-[#080d1a] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex items-center justify-center p-3 sm:p-5 xl:p-6">
      {/* Background Decor Grid & Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.15),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/4 top-10 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-10 right-1/4 h-[450px] w-[450px] rounded-full bg-blue-600/10 dark:bg-indigo-600/15 blur-[120px]" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 grid min-h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:h-[calc(100dvh-3rem)] max-h-[960px] w-full max-w-[1420px] grid-cols-1 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] gap-5 xl:gap-6 items-stretch overflow-hidden">
        {/* Brand Hero Section (Left Column) */}
        <section className="relative hidden lg:flex lg:h-full lg:min-h-0 overflow-hidden rounded-[28px] border border-slate-200/50 dark:border-white/10 shadow-2xl">
          <HeroCarousel images={HERO_IMAGES} onChange={setSlide} />
        </section>

        {/* Auth Form Section (Right Column) */}
        <section className="relative flex flex-col justify-between overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 p-6 sm:p-8 xl:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-colors duration-300 w-full min-w-0">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top Header Controls */}
          <header className="relative z-10 flex w-full items-center justify-between gap-4 mb-3">
            <Link to="/explore" className="group flex items-center gap-2 hover:opacity-95 transition-opacity" title="Về trang Khám Phá UFind">
              <Logo />
            </Link>

            <div className="flex items-center gap-2.5">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-950/60 dark:hover:text-cyan-300 transition-all duration-200 shadow-2xs backdrop-blur-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                title="Khám phá các quán ăn ngon"
                aria-label="Khám phá quán"
              >
                <Compass className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 transition-transform duration-500 group-hover:rotate-45" />
                <span className="hidden sm:inline">Khám phá quán</span>
              </Link>
              <ModeToggle />
            </div>
          </header>

          {/* Main Form Content */}
          <div className="relative z-10 my-auto py-2 w-full max-w-[480px] mx-auto min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-2 shadow-xs backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
              <span>{eyebrow}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.18]">
              {title}
            </h1>

            <p className="mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>

            <div className="mt-5 sm:mt-6">{children}</div>
          </div>

          {/* Footer info */}
          <footer className="relative z-10 w-full text-center pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500">
              &copy; {new Date().getFullYear()} UFind Food Platform. Nền tảng Quản lý & Trải nghiệm Ẩm thực.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
