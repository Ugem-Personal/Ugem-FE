import { toast } from "sonner";
import { showLogoutConfirmToast } from "@/shared/components/ConfirmLogoutToast";

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
    showLogoutConfirmToast(onConfirm);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
