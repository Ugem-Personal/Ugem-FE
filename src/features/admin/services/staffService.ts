import { api } from "@/lib/axios";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Staff = {
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
  hiredAt?: string;
  createdAt?: string;
};

export type ReviewerApplication = {
  id?: string;
  status?: string;
  motivation?: string;
  experience?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  otherSocialUrl?: string;
  rejectionReason?: string;
  customerId?: string;
  createdAt?: string;
};

type StaffPageResult = {
  items?: Staff[];
  totalItems?: number;
  pageSize?: number;
  pageIndex?: number;
};

type ReviewerApplicationPageResult = {
  items?: ReviewerApplication[];
};

export type CreateStaffPayload = {
  email: string;
  fullName: string;
  password: string;
  phoneNumber: string;
};

function unwrapData<T>(payload: ApiResponse<T> | T | null | undefined) {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload as T;
}

export async function getStaffList() {
  const res = await api.get<
    ApiResponse<StaffPageResult | Staff[]> | StaffPageResult | Staff[]
  >("/admin/staff");

  const payload = unwrapData(res.data) ?? [];

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? [];
}

export async function getStaffById(id: string) {
  const res = await api.get<ApiResponse<Staff> | Staff>(`/admin/staff/${id}`);
  return unwrapData(res.data);
}

export async function createStaff(payload: CreateStaffPayload) {
  const res = await api.post<ApiResponse<Staff>>("/admin/staff", payload);
  return res.data;
}

export async function deleteStaff(staffId: string) {
  const res = await api.delete<ApiResponse<null>>(`/admin/staff/${staffId}`);
  return res.data;
}

export async function getReviewerApplications() {
  const res = await api.get<
    | ApiResponse<ReviewerApplicationPageResult | ReviewerApplication[]>
    | ReviewerApplicationPageResult
    | ReviewerApplication[]
  >("/staff", {
    params: {
      pageIndex: 1,
      pageSize: 100,
    },
  });

  const payload = unwrapData(res.data) ?? [];

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? [];
}

export async function acceptReviewerApplication(applicationId: string) {
  const res = await api.post<ApiResponse<null>>("/staff/accept", {
    applicationId,
  });
  return res.data;
}

export async function rejectReviewerApplication(
  applicationId: string,
  reason: string,
) {
  const res = await api.post<ApiResponse<null>>("/staff/reject", {
    applicationId,
    reason,
  });
  return res.data;
}
