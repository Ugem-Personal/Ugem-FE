import { Check, X } from "lucide-react";

type PasswordRequirementsProps = {
  password?: string;
  confirmPassword?: string;
  showConfirmRequirement?: boolean;
};

export function PasswordRequirements({
  password = "",
  confirmPassword = "",
  showConfirmRequirement = false,
}: PasswordRequirementsProps) {
  const isMinLength = password.length >= 6;
  const isMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className="mt-2 space-y-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <div
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
            isMinLength
              ? "bg-emerald-500 text-white dark:bg-emerald-600"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          {isMinLength ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
        </div>
        <span
          className={`font-semibold transition-colors ${
            isMinLength
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Mật khẩu tối thiểu 6 ký tự
        </span>
      </div>

      {showConfirmRequirement && (
        <div className="flex items-center gap-2">
          <div
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
              isMatch
                ? "bg-emerald-500 text-white dark:bg-emerald-600"
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {isMatch ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
          </div>
          <span
            className={`font-semibold transition-colors ${
              isMatch
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Mật khẩu xác nhận trùng khớp
          </span>
        </div>
      )}
    </div>
  );
}
