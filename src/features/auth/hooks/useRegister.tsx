import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../services";
import type { RegisterRequest } from "../types";

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => registerApi(payload),
    onSuccess: () => {
      navigate("/login", { replace: true });
    },
  });
}
