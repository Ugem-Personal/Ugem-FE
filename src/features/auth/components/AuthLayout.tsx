import { type ReactNode, useState } from "react";
import HeroCarousel from "./HeroCarousel";
import { Logo } from "../pages/Logo";
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
    <main className="relative grid min-h-dvh grid-cols-1 overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Background Decor Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Brand Hero Section (Desktop Left Column - Hidden on mobile/tablet) */}
      <section className="relative hidden p-5 lg:sticky lg:top-0 lg:block lg:h-dvh xl:p-6">
        <HeroCarousel images={HERO_IMAGES} onChange={setSlide} />
      </section>

      {/* Auth Form Section (Right Column) */}
      <section className="relative flex min-h-dvh flex-col items-center justify-between px-4 py-6 sm:px-8 sm:py-10 lg:overflow-y-auto xl:px-12">
        {/* Top Header Controls */}
        <div className="flex w-full max-w-[440px] items-center justify-between">
          <Logo />
          <ModeToggle />
        </div>

        {/* Main Card Panel */}
        <div className="my-auto w-full max-w-[440px] py-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-colors duration-300">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            <div className="relative">
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
          </div>
        </div>

        {/* Footer info */}
        <footer className="w-full max-w-[440px] text-center pt-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} UGem Food Platform. Nền tảng Quản lý & Trải nghiệm Ẩm thực.
          </p>
        </footer>
      </section>
    </main>
  );
}
