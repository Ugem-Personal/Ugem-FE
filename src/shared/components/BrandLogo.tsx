import logoLight from "@/assets/ugem-logo.png";
import logoDark from "@/assets/ugem-logo-dark.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className = "h-10 w-auto", alt = "UFind" }: BrandLogoProps) {
  return (
    <div className="relative inline-flex items-center">
      <img
        src={logoLight}
        alt={alt}
        className={cn(className, "dark:hidden print:block select-none")}
      />
      <img
        src={logoDark}
        alt={alt}
        className={cn(
          className,
          "hidden dark:block print:hidden select-none drop-shadow-[0_0_15px_rgba(56,189,248,0.28)]"
        )}
      />
    </div>
  );
}
