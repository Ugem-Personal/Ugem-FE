import { toast } from "sonner";
import { LogOut } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function showLogoutConfirmToast(onConfirm: () => void) {
  toast.custom(
    (id) => (
      <AlertDialog.Root defaultOpen onOpenChange={(open) => {
        if (!open) toast.dismiss(id);
      }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-white/15 dark:bg-slate-900 dark:text-white">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
              <LogOut className="h-6 w-6" />
            </div>
            <AlertDialog.Title className="text-lg font-black">
              Xác nhận đăng xuất?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Phiên làm việc hiện tại sẽ kết thúc. Bạn có chắc chắn muốn thoát khỏi hệ thống UFind?
            </AlertDialog.Description>
            <div className="mt-6 flex items-center justify-center gap-3">
              <AlertDialog.Cancel className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Hủy bỏ
              </AlertDialog.Cancel>
              <AlertDialog.Action onClick={onConfirm} className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-500">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    ),
    { id: "logout-confirm", duration: Infinity },
  );
}
