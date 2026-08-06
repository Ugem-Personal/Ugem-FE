import { toast } from "sonner";
import { LogOut } from "lucide-react";

export function showLogoutConfirmToast(onConfirm: () => void) {
  const LOGOUT_CONFIRM_TOAST_ID = "logout-confirm";

  toast.dismiss(LOGOUT_CONFIRM_TOAST_ID);
  toast.dismiss();

  toast.custom(
    (t) => (
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 p-4.5 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white transition-all duration-300 ring-1 ring-slate-950/5 dark:ring-white/10">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-xs">
            <LogOut className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black tracking-tight text-slate-950 dark:text-white">
                Xác nhận đăng xuất?
              </h4>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Phiên làm việc hiện tại sẽ kết thúc. Bạn có chắc chắn muốn thoát khỏi hệ thống UGem?
            </p>

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => toast.dismiss(t)}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t);
                  onConfirm();
                }}
                className="h-9 px-4.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-xs font-black text-white shadow-md shadow-rose-500/25 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      id: LOGOUT_CONFIRM_TOAST_ID,
      duration: 12000,
      position: "bottom-right",
    }
  );
}
