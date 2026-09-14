import { useEffect, useState } from "react";
import logoLight from "@/assets/ugem-logo.png";
import logoDark from "@/assets/ugem-logo-dark.png";
import { cn } from "@/lib/utils";

export function useIsDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className = "h-10 w-auto", alt = "UFind" }: BrandLogoProps) {
  const isDark = useIsDarkMode();

  return (
    <img
      src={isDark ? logoDark : logoLight}
      alt={alt}
      className={cn(
        "shrink-0 object-contain",
        className,
        "select-none transition-all duration-300",
        isDark && "drop-shadow-[0_0_15px_rgba(56,189,248,0.28)]"
      )}
    />
  );
}
