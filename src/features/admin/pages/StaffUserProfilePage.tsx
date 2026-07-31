import { useEffect, useState, type FormEvent } from "react";
import {
  IdCard,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getCurrentUser } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/shared/services";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";
import { StaffShell } from "../components/StaffShell";

function getInitial(name?: string) {
  return (name || "S").trim().charAt(0).toUpperCase() || "S";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra, vui lòng thử lại.";
}

export default function StaffUserProfilePage() {
  const currentUser = getCurrentUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const displayName =
    profile?.fullName || profile?.name || currentUser?.Name || "Staff";

  const email = profile?.email || currentUser?.Email || "-";

  const roleLabel = profile?.role || currentUser?.Role || "Staff";

  const phoneNumber = profile?.phoneNumber || "Chưa cập nhật";

  const userId = currentUser?.UserId || profile?.userId || profile?.id || "-";

  const displayedAvatarUrl = avatarPreviewUrl || avatarUrl;

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);

      try {
        const data = await getUserProfile();

        if (!active) return;

        setProfile(data ?? null);
        setFullName(data?.fullName || data?.name || currentUser?.Name || "");
        setAvatarUrl(data?.avatarUrl || "");
        setAvatarPreviewUrl("");
        setAvatarFileName(data?.avatarUrl ? "Anh hien tai" : "");
      } catch (error) {
        console.error(error);

        if (active) {
          notify.error("Không tải được hồ sơ Staff.");
          setFullName(currentUser?.Name || "");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [currentUser?.Name]);

  async function handleAvatarUpload(file?: File) {
    if (!file) return;

    setAvatarFileName(file.name);
    setIsUploadingAvatar(true);

    try {
      validateImageFile(file);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setAvatarPreviewUrl(dataUrl);

      const imageUrl = await uploadImage(file);
      setAvatarUrl(imageUrl);
      notify.success("Đã tải avatar lên.");
    } catch (error) {
      console.error("Không thể tải avatar lên:", error);
      setAvatarPreviewUrl("");
      setAvatarFileName(avatarUrl ? "Ảnh hiện tại" : "");
      notify.error("Tải avatar thất bại.", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (isUploadingAvatar) {
      notify.error("Vui lòng chờ avatar tải lên xong rồi lưu.");
      return;
    }

    if (!trimmedName) {
      notify.error("Tên Staff không được để trống.");
      return;
    }

    const toastId = notify.loading("Đang cập nhật hồ sơ Staff...");
    setIsSaving(true);

    try {
      await updateUserProfile({
        fullName: trimmedName,
        avatarUrl: trimmedAvatar || undefined,
      });

      const nextProfile = await getUserProfile();

      setProfile(nextProfile ?? null);

      setFullName(nextProfile?.fullName || nextProfile?.name || trimmedName);

      setAvatarUrl(nextProfile?.avatarUrl || trimmedAvatar);
      setAvatarPreviewUrl("");
      setAvatarFileName(
        nextProfile?.avatarUrl || trimmedAvatar ? "Anh hien tai" : "",
      );

      window.dispatchEvent(new Event("ugem:profile-updated"));

      notify.success("Đã cập nhật hồ sơ Staff.", {
        id: toastId,
      });
    } catch (error) {
      console.error(error);

      notify.error("Cập nhật hồ sơ thất bại.", {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <StaffShell activeItem="profile">
      <div className="relative w-full">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative">
          <div className="sticky top-4 z-30 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/55 p-3 backdrop-blur-xl ring-1 ring-slate-950/5">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-950/5">
                Staff Profile
              </div>

              <h1 className="break-words text-3xl font-black tracking-tight text-slate-950">
                Profile Staff
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Quản lý thông tin hiển thị và tài khoản Staff đang đăng nhập.
              </p>
            </div>

          </div>

          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />

              <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-amber-300/25 blur-2xl" />

              <div className="relative border-b border-white/70 p-6">
                <div className="grid place-items-center text-center">
                  <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-[28px] bg-cyan-100 text-4xl font-black text-cyan-800 shadow-xl shadow-cyan-900/10 ring-1 ring-white/70">
                    {displayedAvatarUrl ? (
                      <img
                        src={displayedAvatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitial(displayName)
                    )}
                  </div>

                  <h2 className="mt-5 max-w-full truncate text-2xl font-black tracking-tight text-slate-950">
                    {displayName}
                  </h2>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                    {email}
                  </p>

                  <span className="mt-4 inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="relative space-y-3 p-5 text-sm">
                <ProfileInfoRow
                  icon={ShieldCheck}
                  label="Vai trò"
                  value={roleLabel}
                />

                <ProfileInfoRow icon={Mail} label="Email" value={email} />

                <ProfileInfoRow
                  icon={Phone}
                  label="Số điện thoại"
                  value={phoneNumber}
                />

                <ProfileInfoRow icon={IdCard} label="User ID" value={userId} />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/20 blur-2xl" />

              <div className="absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />

              <div className="relative mb-6 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-100">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-950">
                    Thông tin hiển thị
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Tên và avatar sẽ được dùng trong menu tài khoản.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-12 animate-pulse rounded-2xl bg-slate-100/80" />

                  <div className="h-12 animate-pulse rounded-2xl bg-slate-100/80" />

                  <div className="h-28 animate-pulse rounded-2xl bg-slate-100/80" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative space-y-5">
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">
                      Tên Staff
                    </span>

                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-950/5 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                      placeholder="Nhập tên hiển thị"
                      disabled={isSaving}
                    />
                  </label>

                  <div className="block">
                    <span className="text-sm font-black text-slate-800">
                      Avatar
                    </span>

                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm ring-1 ring-slate-950/5">
                      <input
                        id="staff-avatar-upload"
                        type="file"
                        accept={IMAGE_UPLOAD_ACCEPT}
                        className="sr-only"
                        disabled={isSaving || isUploadingAvatar}
                        onChange={(event) => {
                          void handleAvatarUpload(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />

                      <label
                        htmlFor="staff-avatar-upload"
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 hover:bg-cyan-700"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        {isUploadingAvatar ? "Đang tải lên..." : "Chọn ảnh"}
                      </label>

                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-500">
                        {avatarFileName || "Chưa chọn ảnh"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm leading-6 text-cyan-900 shadow-sm">
                    Email, role và số điện thoại đang là thông tin đồng bộ từ hệ
                    thống nên chỉ hiển thị tại đây.
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving || isUploadingAvatar}
                    className="h-12 rounded-2xl bg-cyan-600 px-5 font-black text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:hover:translate-y-0"
                  >
                    {isSaving || isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Lưu thay đổi
                  </Button>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm ring-1 ring-slate-950/5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-all text-sm font-black text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}
