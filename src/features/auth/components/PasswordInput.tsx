import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  showIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showIcon = true, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="group relative">
        {showIcon && (
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400" />
        )}
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          className={cn(
            "h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-base font-semibold text-slate-950 dark:text-white shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15",
            showIcon ? "pl-12" : "pl-4",
            "pr-12",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            setShowPassword((prev) => !prev);
          }}
          className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-cyan-800 dark:hover:text-cyan-300 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
