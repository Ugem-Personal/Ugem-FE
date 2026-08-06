import { toast, type ExternalToast } from "sonner";
import { showLogoutConfirmToast } from "@/shared/components/ConfirmLogoutToast";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showLoadingToast,
} from "@/shared/components/ToastNotification";

export const notify = {
  success(message: string, options?: ExternalToast) {
    return showSuccessToast(message, options);
  },
  error(message: string, options?: ExternalToast) {
    return showErrorToast(message, options);
  },
  info(message: string, options?: ExternalToast) {
    return showInfoToast(message, options);
  },
  loading(message: string, options?: ExternalToast) {
    return showLoadingToast(message, options);
  },
  confirmLogout(onConfirm: () => void) {
    showLogoutConfirmToast(onConfirm);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
