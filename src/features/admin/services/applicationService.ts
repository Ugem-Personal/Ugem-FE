import { api } from "@/lib/axios";
import type { Application } from "../types";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getStaffApplications() {
  const res = await api.get<ApiResponse<Application[]>>("/applications", {
    params: {
      pageIndex: 0,
      pageSize: 100,
    },
  });

  return res.data.data ?? [];
}

export async function acceptApplication(id: string) {
  const res = await api.patch<ApiResponse<null>>(`/applications/${id}/status`, {
    status: "Accepted",
  });
  return res.data;
}

export async function rejectApplication(id: string, reason: string) {
  const res = await api.patch<ApiResponse<null>>(`/applications/${id}/status`, {
    status: "Rejected",
    note: reason,
  });

  return res.data;
}
