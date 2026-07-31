import { toast } from "sonner";

const LOGOUT_CONFIRM_TOAST_ID = "logout-confirm";

export const notify = {
  success(message: string, options?: Parameters<typeof toast.success>[1]) {
    toast.success(message, options);
  },
  error(message: string, options?: Parameters<typeof toast.error>[1]) {
    toast.error(message, options);
  },
  info(message: string, options?: Parameters<typeof toast>[1]) {
    toast(message, options);
  },
  loading(message: string, options?: Parameters<typeof toast.loading>[1]) {
    return toast.loading(message, options);
  },
  confirmLogout(onConfirm: () => void) {
    toast("Xác nhận đăng xuất?", {
      id: LOGOUT_CONFIRM_TOAST_ID,
      description: "Phiên hiện tại sẽ kết thúc và bạn cần đăng nhập lại.",
      duration: Infinity,
      action: {
        label: "Logout",
        onClick: () => {
          toast.dismiss(LOGOUT_CONFIRM_TOAST_ID);
          onConfirm();
        },
      },
      cancel: {
        label: "Hủy",
        onClick: () => toast.dismiss(LOGOUT_CONFIRM_TOAST_ID),
      },
    });
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
