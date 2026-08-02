import { UserAccountMenu } from "@/shared/components/UserAccountMenu";
import { ModeToggle } from "@/shared/components/ModeToggle";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function OnboardingTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md transition-colors duration-300">
      <div className="flex items-center gap-3">
        <Link to="/merchant" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 block">UGem</span>
            <span className="text-xs font-black text-foreground block">Merchant Onboarding</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <ModeToggle />
        <UserAccountMenu fallbackName="Merchant Applicant" />
      </div>
    </header>
  );
}
