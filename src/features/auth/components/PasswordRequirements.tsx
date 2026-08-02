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
  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const isStrong = isMinLength && hasUppercase && hasLowercase && hasDigit;
  const isMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className="mt-1.5 space-y-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 text-xs">
      <div className="flex items-center gap-2">
        <div
          className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-colors ${
            isMinLength
              ? "bg-emerald-500 text-white dark:bg-emerald-600"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          {isMinLength ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
        </div>
        <span
          className={`text-[11px] font-semibold transition-colors ${
            isMinLength
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Tối thiểu 8 ký tự
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-colors ${
            isStrong
              ? "bg-emerald-500 text-white dark:bg-emerald-600"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          }`}
        >
          {isStrong ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
        </div>
        <span
          className={`text-[11px] font-semibold transition-colors ${
            isStrong
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Chứa chữ hoa, chữ thường và chữ số
        </span>
      </div>

      {showConfirmRequirement && (
        <div className="flex items-center gap-2">
          <div
            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-colors ${
              isMatch
                ? "bg-emerald-500 text-white dark:bg-emerald-600"
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {isMatch ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
          </div>
          <span
            className={`text-[11px] font-semibold transition-colors ${
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
