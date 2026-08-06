import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../services";
import type { RegisterRequest } from "../types";
import { notify } from "@/shared/lib/notify";
import { getRegisterErrorMessage } from "../errorMessages";

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => registerApi(payload),
    onSuccess: () => {
      notify.success("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      notify.error(getRegisterErrorMessage(error));
    },
  });
}
