import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserAccountMenu } from "@/shared/components";
import { notify } from "@/shared/lib/notify";
import {
  createStaff,
  deleteStaff,
  type CreateStaffPayload,
  type Staff,
} from "../services/staffService";
import { STAFF_LIST_QUERY_KEY, useStaffList } from "../hooks/useStaff";

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const { data: staffList = [], isLoading, isError, error } = useStaffList();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStaffPayload>({
    email: "",
    fullName: "",
    password: "",
    phoneNumber: "",
  });

  async function refreshStaffList() {
    await queryClient.invalidateQueries({ queryKey: STAFF_LIST_QUERY_KEY });
  }

  async function handleCreateStaff() {
    const payload = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      password: form.password,
      phoneNumber: form.phoneNumber.trim(),
    } satisfies CreateStaffPayload;

    if (
      !payload.email ||
      !payload.fullName ||
      !payload.password ||
      !payload.phoneNumber
    ) {
      notify.error("Vui lòng nhập đủ email, tên, mật khẩu và số điện thoại.");
      return;
    }

    setSaving(true);

    try {
      await createStaff(payload);
      notify.success("Đã thêm Staff mới.");
      setForm({ email: "", fullName: "", password: "", phoneNumber: "" });
      await refreshStaffList();
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error ? error.message : "Không thêm được Staff.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStaff(staff: Staff) {
    const staffId = staff.id || staff.userId;

    if (!staffId) {
      notify.error("Không xác định được Staff cần xóa.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa Staff ${staff.fullName || staff.name || staff.email || staffId}?`,
    );

    if (!confirmed) return;

    setDeletingId(staffId);

    try {
      await deleteStaff(staffId);
      notify.success("Đã xóa Staff.");
      await refreshStaffList();
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error ? error.message : "Không xóa được Staff.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 py-6 text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-950/5">
              Staff Management
            </div>

            <h1 className="wrap-break-word text-3xl font-black tracking-tight text-slate-950">
              Quản lý nhân viên
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Theo dõi danh sách Staff đang tham gia vận hành hồ sơ merchant.
            </p>
          </div>

          <UserAccountMenu fallbackName="Admin" />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 w-72 animate-pulse rounded-2xl bg-white/70" />
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-2xl bg-slate-100/80"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/85 p-8 text-center shadow-2xl shadow-rose-950/5 ring-1 ring-rose-100 backdrop-blur-xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-rose-700 shadow-sm">
              !
            </div>

            <h3 className="mb-2 text-lg font-black text-rose-800">
              Không tải được danh sách nhân viên
            </h3>

            <p className="text-sm font-semibold text-rose-700">
              Lỗi:{" "}
              {error instanceof Error
                ? error.message
                : "Không tải được danh sách"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="relative overflow-hidden border-b border-white/70 p-5">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
                <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-amber-300/25 blur-2xl" />

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950">
                      Thêm Staff mới
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tạo tài khoản Staff để tham gia xử lý hồ sơ merchant.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Họ và tên
                  </span>
                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                    placeholder="Nhập họ tên Staff"
                    disabled={saving}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Email
                  </span>
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                    placeholder="staff@example.com"
                    disabled={saving}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Mật khẩu
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                    placeholder="Nhập mật khẩu"
                    disabled={saving}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">
                    Số điện thoại
                  </span>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                    placeholder="0xxxxxxxxx"
                    disabled={saving}
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateStaff()}
                    disabled={saving}
                    className="inline-flex items-center rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Đang thêm..." : "Thêm Staff"}
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="relative overflow-hidden border-b border-white/70 p-5">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
                <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-amber-300/25 blur-2xl" />

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950">
                      Danh sách Staff
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tổng cộng {staffList.length} nhân viên trong hệ thống.
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-black text-cyan-800 shadow-sm">
                    {staffList.length} staff
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-180">
                  <thead className="bg-cyan-50/70 text-left text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
                    <tr>
                      <th className="px-5 py-4">Tên nhân viên</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Vai trò</th>
                      <th className="px-5 py-4">Hành động</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100/80">
                    {staffList.length > 0 ? (
                      staffList.map((staff: Staff, idx: number) => (
                        <tr
                          key={staff.id || idx}
                          className="group transition hover:bg-cyan-50/50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-xs font-black text-white shadow-lg shadow-slate-950/10">
                                {(staff.name || staff.fullName || "NA")
                                  .trim()
                                  .split(/\s+/)
                                  .slice(-2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>

                              <p className="max-w-60 truncate font-black text-slate-950">
                                {staff.name || staff.fullName || "N/A"}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-72 truncate text-sm font-semibold text-slate-700">
                              {staff.email || "N/A"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800 shadow-sm">
                              {staff.role || "Staff"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            <button
                              type="button"
                              onClick={() => void handleDeleteStaff(staff)}
                              disabled={Boolean(
                                deletingId &&
                                deletingId === (staff.id || staff.userId),
                              )}
                              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId &&
                              deletingId === (staff.id || staff.userId)
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-6 py-14 text-center" colSpan={4}>
                          <div className="mx-auto max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8">
                            <p className="text-sm font-bold text-slate-500">
                              Chưa có nhân viên nào.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
