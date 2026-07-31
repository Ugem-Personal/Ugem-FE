import { useMutation } from "@tanstack/react-query";
import { createMerchantApplication, resubmitApplication } from "../services";
import type { CreateApplicationPayload } from "../types";

export function useCreateApplication() {
  return useMutation({
    mutationFn: createMerchantApplication,
  });
}

export function useResubmitApplication(applicationId?: string) {
  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) => {
      if (!applicationId) {
        return Promise.reject(new Error("Không tìm thấy hồ sơ để gửi lại."));
      }

      return resubmitApplication(applicationId, payload);
    },
  });
}
