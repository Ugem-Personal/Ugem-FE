import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  Lock,
  Calendar,
} from "lucide-react";

import { getCurrentUser, refreshCurrentSession } from "@/features/auth";
import { UserAccountMenu } from "@/shared/components";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
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
  const handleBack = useSafeBack("/customer");
  const currentUser = getCurrentUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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
  const [showReviewerForm, setShowReviewerForm] = useState(false);

  const displayName =
    profile?.fullName || profile?.name || currentUser?.Name || "Customer";

  const email = profile?.email || currentUser?.Email || "-";
  const baseRoleLabel = profile?.role || currentUser?.Role || "Customer";
  const displayedAvatarUrl = avatarPreviewUrl || avatarUrl;

  const reviewerStatus = reviewerApp?.status?.toLowerCase() ?? "";
  const isReviewerPending =
    reviewerApp && (reviewerStatus === "" || reviewerStatus === "pending");
  const isReviewerAccepted =
    reviewerApp &&
    (reviewerStatus === "accept" ||
      reviewerStatus === "accepted" ||
      reviewerStatus === "approved");
  const roleLabel = baseRoleLabel;
  const canEditReviewer = !reviewerApp || isReviewerPending;

  const refreshReviewerSessionIfNeeded = useCallback(async (
    application: ReviewerApplication | null,
  ) => {
    const status = application?.status?.toLowerCase() ?? "";
    const isAccepted =
      application &&
      (status === "accept" || status === "accepted" || status === "approved");

    if (!isAccepted || currentUser?.Role === "Reviewer") return;

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
    }
  }, [currentUser?.Role]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getUserProfile();

      setProfile(data ?? null);
      setFullName(data?.fullName || data?.name || currentUser?.Name || "");
      setPhoneNumber(data?.phoneNumber || "");
      setAvatarUrl(data?.avatarUrl || "");
      setAvatarPreviewUrl("");
      setAvatarFileName(data?.avatarUrl ? "Ảnh hiện tại" : "");
    } catch (error) {
      console.error(error);
      notify.error("Không tải được thông tin hồ sơ.");
      setFullName(currentUser?.Name || "");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.Name]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      await loadProfile();

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
        // Normal if user has no reviewer application
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [loadProfile, refreshReviewerSessionIfNeeded]);

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
      notify.success("Đã tải avatar lên thành công.");
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
    const trimmedPhone = phoneNumber.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (isUploadingAvatar) {
      notify.error("Vui lòng chờ avatar tải lên xong rồi lưu.");
      return;
    }

    if (!trimmedName) {
      notify.error("Họ và tên không được để trống.");
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      notify.error("Họ và tên phải từ 2 đến 100 ký tự.");
      return;
    }

    if (trimmedPhone && !/^[0-9+()\-\s]{8,20}$/.test(trimmedPhone)) {
      notify.error("Số điện thoại không hợp lệ (8 - 20 ký tự số).");
      return;
    }

    setIsSaving(true);
    const toastId = notify.loading("Đang cập nhật hồ sơ cá nhân...");

    try {
      await updateUserProfile({
        fullName: trimmedName,
        phoneNumber: trimmedPhone || undefined,
        avatarUrl: trimmedAvatar || undefined,
      });

      const nextProfile = await getUserProfile();

      setProfile(nextProfile ?? null);
      setFullName(nextProfile?.fullName || nextProfile?.name || trimmedName);
      setPhoneNumber(nextProfile?.phoneNumber || trimmedPhone);
      setAvatarUrl(nextProfile?.avatarUrl || trimmedAvatar);
      setAvatarPreviewUrl("");
      setAvatarFileName(
        nextProfile?.avatarUrl || trimmedAvatar ? "Ảnh hiện tại" : "",
      );

      window.dispatchEvent(new Event("ugem:profile-updated"));

      notify.success("Đã cập nhật hồ sơ cá nhân thành công.", {
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
      notify.error("Gửi đơn Reviewer thất bại.", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmittingReviewerApp(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Dynamic Glow Backdrops */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Top Navbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadProfile()}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
            <UserAccountMenu
              fallbackName={roleLabel}
              avatarUrl={displayedAvatarUrl}
            />
          </div>
        </div>

        {/* Hero Banner Box */}
        <div className="relative overflow-hidden rounded-[36px] border border-slate-200/80 dark:border-white/10 bg-gradient-to-r from-slate-950 via-cyan-950/90 to-slate-950 p-8 shadow-2xl backdrop-blur-3xl mb-8 text-white">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pt-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              {/* Avatar Frame */}
              <div className="relative group">
                <div className="h-32 w-32 overflow-hidden rounded-3xl border-2 border-cyan-400/40 bg-slate-800 shadow-2xl shadow-cyan-500/20">
                  {displayedAvatarUrl ? (
                    <img
                      src={displayedAvatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl font-black text-cyan-300">
                      {getInitial(displayName)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                  {roleLabel} Account
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {displayName}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-300">
                  {email}
                </p>
              </div>
            </div>

            {profile?.createdAt && (
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
                <Calendar className="h-4 w-4 text-cyan-400" />
                Tham gia: {new Date(profile.createdAt).toLocaleDateString("vi-VN")}
              </div>
            )}
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Column Left: Overview Stats */}
          <div className="md:col-span-4 space-y-6">
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-xl backdrop-blur-2xl transition-colors duration-300">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4">
                Thông tin hệ thống
              </h3>
              <div className="space-y-4">
                <BentoStatCard icon={ShieldCheck} label="Quyền tài khoản" value={roleLabel} />
                <BentoStatCard icon={Mail} label="Email (Cố định)" value={email} isReadOnly />
                <BentoStatCard
                  icon={Phone}
                  label="Số điện thoại"
                  value={phoneNumber || "Chưa cập nhật"}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/30 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50/80 via-white to-white dark:from-cyan-950/40 dark:via-slate-900 dark:to-slate-900 p-6 shadow-xl backdrop-blur-2xl">
              <div className="flex items-center gap-3 mb-3 text-cyan-600 dark:text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">UGem Account Security</h4>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Tài khoản được đồng bộ trực tiếp với hệ thống OAuth & JWT Token của UGem. Email của bạn là thông tin nhận dạng chính thức.
              </p>
            </div>
          </div>

          {/* Column Right: Edit Form */}
          <div className="md:col-span-8">
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Chỉnh sửa hồ sơ cá nhân</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật họ tên, số điện thoại và ảnh đại diện</p>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4 py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
                  <p className="text-xs font-bold">Đang tải dữ liệu hồ sơ...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
                      placeholder="Nhập họ và tên của bạn"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
                      placeholder="Nhập số điện thoại (VD: 0912345678)"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Ảnh đại diện Avatar
                    </label>
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 p-3">
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
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-950 dark:bg-cyan-500 px-4 text-xs font-black text-white dark:text-slate-950 transition hover:bg-cyan-600 dark:hover:bg-cyan-400 active:scale-95 shadow-md"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        {isUploadingAvatar ? "Đang tải lên..." : "Tải ảnh mới"}
                      </label>
                      <span className="truncate text-xs font-mono text-slate-500 dark:text-slate-400">
                        {avatarFileName || "Chưa chọn file mới"}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving || isUploadingAvatar}
                    className="h-12 w-full sm:w-auto gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-sm font-black text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving || isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Lưu thông tin hồ sơ
                  </Button>
                </form>
              )}
            </div>

            {/* Dining Preferences Section */}
            <DiningPreferencesCard />
          </div>

          {/* Column Bottom: Reviewer Program Section */}
          {reviewerApp && isReviewerAccepted && (
            <div className="col-span-12 rounded-3xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-6 shadow-xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Đơn Reviewer đã được chấp nhận!</h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Tài khoản của bạn đã được nâng cấp chính thức thành Reviewer trên UGem.
                    </p>
                  </div>
                </div>
                <ReviewerStatusBadge status={reviewerApp.status} />
              </div>
            </div>
          )}

          {canEditReviewer && !showReviewerForm && (
            <div className="col-span-12 rounded-3xl border border-violet-500/30 bg-white/80 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {reviewerApp ? "Hồ sơ Reviewer (Đang chờ duyệt)" : "Trở thành Reviewer chính thức"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                      Đánh giá món ăn, nhận mã giới thiệu Affiliate và tích lũy phần thưởng độc quyền từ UGem.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowReviewerForm(true)}
                  className="h-12 shrink-0 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 font-black text-white shadow-lg shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500"
                >
                  {reviewerApp ? "Chỉnh sửa hồ sơ" : "Đăng ký Reviewer"}
                </Button>
              </div>
            </div>
          )}

          {canEditReviewer && showReviewerForm && (
            <div className="col-span-12 rounded-3xl border border-violet-500/30 bg-white/90 dark:bg-slate-900/80 p-8 shadow-2xl backdrop-blur-3xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Đơn đăng ký Reviewer</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewerForm(false)}
                  className="h-9 rounded-xl border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Đóng
                </Button>
              </div>

              <form onSubmit={handleReviewerApplicationSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Động lực đăng ký *
                  </label>
                  <textarea
                    value={reviewerForm.motivation}
                    onChange={(event) =>
                      setReviewerForm((prev) => ({
                        ...prev,
                        motivation: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 p-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    placeholder="Lý do bạn muốn tham gia chương trình..."
                    disabled={isSubmittingReviewerApp}
                  />
                </div>

                <ReviewerInput label="Kinh nghiệm" value={reviewerForm.experience} onChange={(v) => setReviewerForm((p) => ({ ...p, experience: v }))} disabled={isSubmittingReviewerApp} />
                <ReviewerInput label="Facebook Link" value={reviewerForm.facebookUrl} onChange={(v) => setReviewerForm((p) => ({ ...p, facebookUrl: v }))} disabled={isSubmittingReviewerApp} />
                <ReviewerInput label="TikTok Link" value={reviewerForm.tiktokUrl} onChange={(v) => setReviewerForm((p) => ({ ...p, tiktokUrl: v }))} disabled={isSubmittingReviewerApp} />
                <ReviewerInput label="YouTube Link" value={reviewerForm.youtubeUrl} onChange={(v) => setReviewerForm((p) => ({ ...p, youtubeUrl: v }))} disabled={isSubmittingReviewerApp} />

                <div className="sm:col-span-2 flex justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={isSubmittingReviewerApp}
                    className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 font-black text-white shadow-lg shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500"
                  >
                    {isSubmittingReviewerApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Gửi đơn xét duyệt
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BentoStatCard({
  icon: Icon,
  label,
  value,
  isReadOnly,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  isReadOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          {isReadOnly && <Lock className="h-3 w-3 text-slate-400" />}
        </div>
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">{value}</p>
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
    <div>
      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        placeholder={label}
        disabled={disabled}
      />
    </div>
  );
}

function ReviewerStatusBadge({ status }: { status?: string }) {
  const v = status?.toLowerCase();
  if (v === "accept" || v === "accepted" || v === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        ĐÃ DUYỆT
      </span>
    );
  }
  if (v === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
        TỪ CHỐI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
      CHỜ DUYỆT
    </span>
  );
}

import {
  getCustomerPreferences,
  updateCustomerPreferences,
  type CustomerPreferences,
} from "../services/customerPreferenceService";

function DiningPreferencesCard() {
  const [preferences, setPreferences] = useState<CustomerPreferences>({
    preferredRestaurantTypes: [],
    preferredMainDishTypes: [],
    preferredPriceRanges: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const restaurantTypeOptions = ["Quán ăn", "Nhà hàng", "Cafe", "Ăn vặt", "Quán nhậu"];
  const mainDishTypeOptions = ["Cơm", "Bún", "Phở", "Lẩu", "Nướng", "Trà sữa"];
  const priceRangeOptions = ["Bình dân", "Trung bình", "Cao cấp"];

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getCustomerPreferences();
        if (active && data) {
          setPreferences({
            preferredRestaurantTypes: data.preferredRestaurantTypes || [],
            preferredMainDishTypes: data.preferredMainDishTypes || [],
            preferredPriceRanges: data.preferredPriceRanges || [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const toggleItem = (key: keyof CustomerPreferences, value: string) => {
    setPreferences((prev) => {
      const current = prev[key] || [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savedPreferences = await updateCustomerPreferences(preferences);
      setPreferences(savedPreferences);
      notify.success(
        "Đã lưu sở thích. Gợi ý quán sẽ được cập nhật theo gu của bạn.",
      );
    } catch (err) {
      console.error(err);
      notify.error("Cập nhật sở thích thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Sở thích ăn uống
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cá nhân hóa gợi ý quán ăn dành riêng cho bạn
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="h-10 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 text-xs font-black shadow-md transition"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Lưu sở thích
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-slate-400">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
          <p className="mt-2 text-xs font-bold">Đang tải sở thích...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Loại quán yêu thích
            </label>
            <div className="flex flex-wrap gap-2.5">
              {restaurantTypeOptions.map((option) => {
                const checked = preferences.preferredRestaurantTypes.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem("preferredRestaurantTypes", option)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      checked
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-400/50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Món chính ưa thích
            </label>
            <div className="flex flex-wrap gap-2.5">
              {mainDishTypeOptions.map((option) => {
                const checked = preferences.preferredMainDishTypes.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem("preferredMainDishTypes", option)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      checked
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-400/50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Mức giá mong muốn
            </label>
            <div className="flex flex-wrap gap-2.5">
              {priceRangeOptions.map((option) => {
                const checked = preferences.preferredPriceRanges.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem("preferredPriceRanges", option)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      checked
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-400/50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
