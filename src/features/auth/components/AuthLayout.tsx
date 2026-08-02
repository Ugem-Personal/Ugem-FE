import { type ReactNode, useState } from "react";
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
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex items-center justify-center p-3 sm:p-5 lg:p-6 xl:p-8">
      {/* Background Decor Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 grid w-full max-w-[1440px] min-h-[calc(100dvh-3rem)] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 xl:gap-8 items-stretch">
        {/* Brand Hero Section (Left Column) */}
        <section className="relative hidden lg:flex lg:h-full">
          <HeroCarousel images={HERO_IMAGES} intervalMs={4500} onChange={setSlide} />
        </section>

        {/* Auth Form Section (Right Column) */}
        <section className="relative flex flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 xl:p-10 shadow-xl backdrop-blur-xl transition-colors duration-300">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top Header Controls */}
          <header className="relative z-10 flex w-full items-center justify-between">
            <Logo />
            <ModeToggle />
          </header>

          {/* Main Form Content */}
          <div className="relative z-10 my-auto py-6 w-full max-w-[440px] mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
              <span>{eyebrow}</span>
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {title}
            </h1>

            <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>

            <div className="mt-6">{children}</div>
          </div>

          {/* Footer info */}
          <footer className="relative z-10 w-full text-center pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} UGem Food Platform. Nền tảng Quản lý & Trải nghiệm Ẩm thực.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}
