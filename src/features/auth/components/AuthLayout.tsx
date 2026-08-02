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
    <main className="relative h-dvh max-h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex items-center justify-center p-3 sm:p-4 xl:p-5">
      {/* Background Decor Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 grid h-full max-h-full w-full max-w-[1360px] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 xl:gap-6 items-stretch overflow-hidden">
        {/* Brand Hero Section (Left Column) */}
        <section className="relative hidden lg:flex lg:h-full lg:min-h-0 overflow-hidden">
          <HeroCarousel images={HERO_IMAGES} intervalMs={4000} onChange={setSlide} />
        </section>

        {/* Auth Form Section (Right Column) */}
        <section className="relative flex flex-col justify-between overflow-y-auto rounded-[24px] border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 xl:p-8 shadow-xl backdrop-blur-xl transition-colors duration-300">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top Header Controls */}
          <header className="relative z-10 flex w-full items-center justify-between mb-2">
            <Link to="/explore" className="group flex items-center gap-2 hover:opacity-85 transition-opacity" title="Về trang Khám Phá">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:hover:border-cyan-800 dark:hover:bg-cyan-950 dark:hover:text-cyan-300 transition-all shadow-xs"
                title="Khám phá các quán ăn ngon"
              >
                <Compass className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Khám phá quán</span>
              </Link>
              <ModeToggle />
            </div>
          </header>

          {/* Main Form Content */}
          <div className="relative z-10 my-auto py-2 w-full max-w-[400px] mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-300">
              <span>{eyebrow}</span>
            </div>

            <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {title}
            </h1>

            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>

            <div className="mt-4">{children}</div>
          </div>

          {/* Footer info */}
          <footer className="relative z-10 w-full text-center pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} UGem Food Platform. Nền tảng Quản lý & Trải nghiệm Ẩm thực.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
