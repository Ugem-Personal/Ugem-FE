import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getCurrentUser, refreshCurrentSession } from "@/features/auth";
import { UserAccountMenu } from "@/shared/components";
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
import {
  createReviewerApplication,
  getMyReviewerApplication,
  updateReviewerApplication,
  type ReviewerApplication,
} from "@/features/review/services";

function getInitial(name?: string) {
  return (name || "C").trim().charAt(0).toUpperCase() || "C";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra, vui lòng thử lại.";
}

export default function CustomerProfilePage() {
  const currentUser = getCurrentUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [reviewerApp, setReviewerApp] = useState<ReviewerApplication | null>(
    null,
  );
  const [reviewerForm, setReviewerForm] = useState({
    motivation: "",
    experience: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    otherSocialUrl: "",
  });
  const [isSubmittingReviewerApp, setIsSubmittingReviewerApp] = useState(false);
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);
  const [showReviewerForm, setShowReviewerForm] = useState(false);

  const displayName =
    profile?.fullName || profile?.name || currentUser?.Name || "Customer";

  const email = profile?.email || currentUser?.Email || "-";

  const baseRoleLabel = profile?.role || currentUser?.Role || "Customer";

  const phoneNumber = profile?.phoneNumber || "Chưa cập nhật";

  const displayedAvatarUrl = avatarPreviewUrl || avatarUrl;

  const reviewerStatus = reviewerApp?.status?.toLowerCase() ?? "";
  const isReviewerPending =
    reviewerApp && (reviewerStatus === "" || reviewerStatus === "pending");
  const isReviewerAccepted =
    reviewerApp &&
    (reviewerStatus === "accept" ||
      reviewerStatus === "accepted" ||
      reviewerStatus === "approved");
  const profileContextLabel = baseRoleLabel;
  const roleLabel = baseRoleLabel;
  const isReviewerRejected = reviewerApp && reviewerStatus === "rejected";
  const canEditReviewer = !reviewerApp || isReviewerPending;

  const refreshReviewerSessionIfNeeded = useCallback(async (
    application: ReviewerApplication | null,
  ) => {
    const status = application?.status?.toLowerCase() ?? "";
    const isAccepted =
      application &&
      (status === "accept" || status === "accepted" || status === "approved");

    if (!isAccepted || currentUser?.Role === "Reviewer") return;

    setIsRefreshingRole(true);

    try {
      const refreshed = await refreshCurrentSession();

      if (refreshed.user.Role === "Reviewer") {
        setProfile((current) => ({
          ...(current ?? {}),
          role: "Reviewer",
        }));
        notify.success("Tài khoản đã được cập nhật thành Reviewer.");
      }
    } catch (error) {
      console.error(error);
      notify.error("Không thể cập nhật phiên đăng nhập Reviewer.");
    } finally {
      setIsRefreshingRole(false);
    }
  }, [currentUser?.Role]);

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
        setAvatarFileName(data?.avatarUrl ? "Ảnh hiện tại" : "");
      } catch (error) {
        console.error(error);

        if (active) {
          notify.error("Không tải được hồ sơ.");
          setFullName(currentUser?.Name || "");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const loadReviewerApp = async () => {
      try {
        const data = await getMyReviewerApplication();
        if (active) {
          setReviewerApp(data);
          void refreshReviewerSessionIfNeeded(data);
          if (data) {
            setReviewerForm({
              motivation: data.motivation ?? "",
              experience: data.experience ?? "",
              facebookUrl: data.facebookUrl ?? "",
              tiktokUrl: data.tiktokUrl ?? "",
              youtubeUrl: data.youtubeUrl ?? "",
              otherSocialUrl: data.otherSocialUrl ?? "",
            });
          }
        }
      } catch {
        // reviewer application not found is normal for most customers
      }
    };

    void loadProfile();
    void loadReviewerApp();

    return () => {
      active = false;
    };
  }, [currentUser?.Name, refreshReviewerSessionIfNeeded]);

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
      notify.error(`Tên ${profileContextLabel} không được để trống.`);
      return;
    }

    const toastId = notify.loading(
      `Đang cập nhật hồ sơ ${profileContextLabel}...`,
    );
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

      notify.success(`Đã cập nhật hồ sơ ${profileContextLabel}.`, {
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

  async function handleReviewerApplicationSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const motivation = reviewerForm.motivation.trim();
    const socialLinks = [
      reviewerForm.facebookUrl,
      reviewerForm.tiktokUrl,
      reviewerForm.youtubeUrl,
      reviewerForm.otherSocialUrl,
    ].map((value) => value.trim());

    if (!motivation) {
      notify.error("Vui lòng nhập động lực đăng ký Reviewer.");
      return;
    }

    if (!socialLinks.some(Boolean)) {
      notify.error("Vui lòng thêm ít nhất một liên kết mạng xã hội.");
      return;
    }

    setIsSubmittingReviewerApp(true);

    try {
      if (reviewerApp?.id && isReviewerPending) {
        await updateReviewerApplication({
          reviewerApplicationId: reviewerApp.id,
          motivation,
          experience: reviewerForm.experience.trim() || undefined,
          facebookUrl: reviewerForm.facebookUrl.trim() || undefined,
          tiktokUrl: reviewerForm.tiktokUrl.trim() || undefined,
          youtubeUrl: reviewerForm.youtubeUrl.trim() || undefined,
          otherSocialUrl: reviewerForm.otherSocialUrl.trim() || undefined,
        });
        notify.success("Đã cập nhật hồ sơ Reviewer.");
      } else {
        await createReviewerApplication({
          motivation,
          experience: reviewerForm.experience.trim() || undefined,
          facebookUrl: reviewerForm.facebookUrl.trim() || undefined,
          tiktokUrl: reviewerForm.tiktokUrl.trim() || undefined,
          youtubeUrl: reviewerForm.youtubeUrl.trim() || undefined,
          otherSocialUrl: reviewerForm.otherSocialUrl.trim() || undefined,
        });
        notify.success("Đã gửi đơn đăng ký Reviewer.");
      }

      const nextApplication = await getMyReviewerApplication();
      setReviewerApp(nextApplication);
    } catch (error) {
      console.error(error);
      notify.error(
        reviewerApp?.id && isReviewerPending
          ? "Cập nhật hồ sơ Reviewer thất bại."
          : "Gửi đơn Reviewer thất bại.",
        {
          description: getErrorMessage(error),
        },
      );
    } finally {
      setIsSubmittingReviewerApp(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edfafa_0%,#f7fbfc_34%,#ffffff_100%)] text-slate-950">
      <header className="border-b border-white/80 bg-white/75 shadow-sm shadow-cyan-950/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-3xl font-black">UGem</h1>
            <p className="text-sm font-medium text-slate-500">
              Quản lý thông tin tài khoản {profileContextLabel}
            </p>
          </div>

          <UserAccountMenu
            fallbackName={profileContextLabel}
            avatarUrl={displayedAvatarUrl}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-5">
        <div className="relative">
          <div className="sticky top-4 z-30 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/55 p-3 backdrop-blur-xl ring-1 ring-slate-950/5">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-950/5">
                {profileContextLabel} Profile
              </div>

              <h2 className="wrap-break-word text-3xl font-black tracking-tight text-slate-950">
                Profile {profileContextLabel}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tên và avatar sẽ được dùng trong menu tài khoản.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-2xl border-white/70 bg-white/80 px-4 font-black shadow-sm ring-1 ring-slate-950/5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              <Button
                asChild
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-2xl border-white/70 bg-white/80 px-4 font-black shadow-sm ring-1 ring-slate-950/5"
              >
                <Link to="/customer">
                  <ArrowLeft className="h-4 w-4" />
                  Về trang chủ
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl mix-blend-multiply" />
              <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl mix-blend-multiply" />

              <div className="relative border-b border-white/40 bg-white/40 p-8 backdrop-blur-md">
                <div className="grid place-items-center text-center">
                  <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[28px] bg-gradient-to-br from-cyan-100 to-blue-100 text-4xl font-black text-cyan-800 shadow-xl shadow-cyan-900/10 ring-2 ring-white/80 transition-transform duration-500 hover:scale-105">
                    {displayedAvatarUrl ? (
                      <img
                        src={displayedAvatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    ) : (
                      getInitial(displayName)
                    )}
                  </div>

                  <h3 className="mt-5 max-w-full truncate text-[22px] font-black tracking-tight text-slate-900 leading-tight">
                    {displayName}
                  </h3>

                  <p className="mt-1 truncate text-[15px] font-medium text-slate-500">
                    {email}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/60 bg-gradient-to-r from-cyan-50/90 to-blue-50/90 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-800 shadow-sm">
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="relative space-y-3 p-6 text-sm bg-white/30 backdrop-blur-md">
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
                  <h3 className="text-xl font-black text-slate-950">
                    Thông tin hiển thị
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Bạn có thể cập nhật tên hiển thị và avatar.
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
                      Tên {profileContextLabel}
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
                        id="customer-avatar-upload"
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
                        htmlFor="customer-avatar-upload"
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

            {/* Reviewer application status */}
            {reviewerApp && isReviewerAccepted && (
              <section className="relative col-span-full overflow-hidden rounded-[28px] border border-emerald-100 bg-emerald-50/80 p-5 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-100 backdrop-blur-2xl">
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-emerald-950">
                        Hồ sơ đăng ký Reviewer đã được duyệt
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-emerald-700">
                        {roleLabel === "Reviewer"
                          ? "Bạn có thể bắt đầu hoạt động với vai trò Reviewer."
                          : isRefreshingRole
                            ? "Đang cập nhật phiên đăng nhập để mở quyền Affiliate..."
                          : "Đơn đã được duyệt, nhưng tài khoản hiện vẫn là Customer nên chưa dùng được Affiliate."}
                      </p>
                    </div>
                  </div>
                  <ReviewerStatusBadge status={reviewerApp.status} />
                </div>
              </section>
            )}

            {reviewerApp && !isReviewerAccepted && (
              <section className="relative col-span-full overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-violet-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl" />
                <div className="relative mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Đơn đăng ký Reviewer
                    </h3>
                    <p className="text-xs text-slate-500">
                      Trạng thái đơn đăng ký làm Reviewer của bạn
                    </p>
                  </div>
                  <ReviewerStatusBadge status={reviewerApp.status} />
                </div>
                {reviewerApp.motivation && (
                  <p className="relative text-sm text-slate-600">
                    <span className="font-black text-slate-800">
                      Động lực:{" "}
                    </span>
                    {reviewerApp.motivation}
                  </p>
                )}
                {reviewerApp.rejectionReason && (
                  <p className="relative mt-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                    Lý do từ chối: {reviewerApp.rejectionReason}
                  </p>
                )}
                {isReviewerRejected && (
                  <p className="relative mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                    Hồ sơ bị từ chối. Vui lòng liên hệ hỗ trợ nếu cần mở lại
                    quyền nộp hồ sơ.
                  </p>
                )}
              </section>
            )}

            {canEditReviewer && !showReviewerForm && (
              <section className="relative col-span-full overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-violet-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-slate-950">
                        {reviewerApp
                          ? "Hồ sơ Reviewer (chờ duyệt)"
                          : "Đăng ký làm Reviewer"}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {reviewerApp
                          ? "Bạn có thể chỉnh sửa hồ sơ trước khi được duyệt."
                          : "Gửi hồ sơ để đội ngũ xét duyệt vai trò Reviewer."}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowReviewerForm(true)}
                    className="h-11 shrink-0 rounded-2xl bg-violet-600 px-5 font-black text-white shadow-lg shadow-violet-900/15 hover:bg-violet-700"
                  >
                    {reviewerApp ? "Chỉnh sửa hồ sơ" : "Đăng ký ngay"}
                  </Button>
                </div>
              </section>
            )}

            {canEditReviewer && showReviewerForm && (
              <section className="relative col-span-full overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-violet-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl" />
                <div className="relative mb-5 flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-950">
                      {reviewerApp
                        ? "Chỉnh sửa hồ sơ Reviewer"
                        : "Đăng ký làm Reviewer"}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {reviewerApp
                        ? "Cập nhật hồ sơ trong lúc đang chờ duyệt."
                        : "Gửi hồ sơ để đội ngũ xét duyệt vai trò Reviewer."}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleReviewerApplicationSubmit}
                  className="relative grid gap-4 md:grid-cols-2"
                >
                  <label className="block md:col-span-2">
                    <span className="text-sm font-black text-slate-800">
                      Động lực *
                    </span>
                    <textarea
                      value={reviewerForm.motivation}
                      onChange={(event) =>
                        setReviewerForm((prev) => ({
                          ...prev,
                          motivation: event.target.value,
                        }))
                      }
                      className="mt-2 min-h-28 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-950/5 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
                      placeholder="Vì sao bạn muốn trở thành Reviewer?"
                      disabled={isSubmittingReviewerApp}
                    />
                  </label>

                  <ReviewerInput
                    label="Kinh nghiệm"
                    value={reviewerForm.experience}
                    onChange={(value) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        experience: value,
                      }))
                    }
                    disabled={isSubmittingReviewerApp}
                  />
                  <ReviewerInput
                    label="Facebook URL"
                    value={reviewerForm.facebookUrl}
                    onChange={(value) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        facebookUrl: value,
                      }))
                    }
                    disabled={isSubmittingReviewerApp}
                  />
                  <ReviewerInput
                    label="TikTok URL"
                    value={reviewerForm.tiktokUrl}
                    onChange={(value) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        tiktokUrl: value,
                      }))
                    }
                    disabled={isSubmittingReviewerApp}
                  />
                  <ReviewerInput
                    label="YouTube URL"
                    value={reviewerForm.youtubeUrl}
                    onChange={(value) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        youtubeUrl: value,
                      }))
                    }
                    disabled={isSubmittingReviewerApp}
                  />
                  <ReviewerInput
                    label="Link khác"
                    value={reviewerForm.otherSocialUrl}
                    onChange={(value) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        otherSocialUrl: value,
                      }))
                    }
                    disabled={isSubmittingReviewerApp}
                  />

                  <div className="flex flex-wrap items-end gap-3 md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmittingReviewerApp}
                      onClick={() => setShowReviewerForm(false)}
                      className="h-12 rounded-2xl border-violet-200 px-5 font-black text-violet-700 hover:bg-violet-50"
                    >
                      Đóng
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingReviewerApp}
                      className="h-12 rounded-2xl bg-violet-600 px-5 font-black text-white shadow-lg shadow-violet-900/15 hover:bg-violet-700"
                    >
                      {isSubmittingReviewerApp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      {reviewerApp ? "Cập nhật" : "Gửi hồ sơ"}
                    </Button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
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
    <div className="flex items-start gap-4 rounded-2xl border border-white/50 bg-white/60 p-3.5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-white/80 group">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 shadow-sm ring-1 ring-cyan-200/50 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-4.5 w-4.5" />
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 group-hover:text-cyan-700 transition-colors">
          {label}
        </p>

        <p className="mt-1 break-all text-[14px] font-bold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function ReviewerInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-950/5 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
        placeholder={label}
        disabled={disabled}
      />
    </label>
  );
}

function ReviewerStatusBadge({ status }: { status?: string }) {
  const v = status?.toLowerCase();
  if (v === "accept" || v === "accepted" || v === "approved") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5" />
        Đã chấp thuận
      </span>
    );
  }
  if (v === "rejected") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 shadow-sm">
        Đã từ chối
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 shadow-sm">
      Chờ duyệt
    </span>
  );
}
