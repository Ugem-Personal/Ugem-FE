import { toast, type ExternalToast } from "sonner";
import { showLogoutConfirmToast } from "@/shared/components/ConfirmLogoutToast";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showLoadingToast,
} from "@/shared/components/ToastNotification";

export function getErrorMessage(
  error: unknown,
  fallback = "Có lỗi xảy ra. Vui lòng thử lại.",
): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as any;
    const responseMsg = err.response?.data?.message;
    if (Array.isArray(responseMsg)) return responseMsg.join(", ");
    if (typeof responseMsg === "string" && responseMsg.trim()) return responseMsg;

    const responseErr = err.response?.data?.error;
    if (typeof responseErr === "string" && responseErr.trim()) return responseErr;

    if (err.message && typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }
  return fallback;
}

export const notify = {
  success(message: string, options?: ExternalToast) {
    return showSuccessToast(message, options);
  },
  error(message: string, options?: ExternalToast) {
    return showErrorToast(message, options);
  },
  errorApi(
    error: unknown,
    fallbackMessage = "Thao tác thất bại. Vui lòng thử lại.",
    options?: ExternalToast,
  ) {
    const message = getErrorMessage(error, fallbackMessage);
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
