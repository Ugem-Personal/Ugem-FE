import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ImagePlus,
  Instagram,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  Lock,
  Calendar,
  Coins,
  Sparkles,
  Gift,
  History,
  QrCode,
  Star,
  ChevronRight,
  TrendingUp,
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
import {
  getReviewerProfile,
  type ReviewerProfileData,
} from "../services/customerService";

function getInitial(name?: string) {
  return (name || "C").trim().charAt(0).toUpperCase() || "C";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra, vui lòng thử lại.";
}

function getRankDetails(points: number, rankStr?: string) {
  let currentTier = "Bronze";
  let tierName = "Đồng";
  let tierIcon = "🥉";
  let nextTierName = "Bạc";
  let minPoints = 0;
  let nextTierPoints = 100;
  let bgGradient =
    "from-amber-950/90 via-stone-900 to-amber-900/70 border-amber-600/40 text-amber-100 shadow-amber-500/10";
  let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
  let glowColor = "bg-amber-500/15";

  if (points >= 1000 || rankStr === "Diamond") {
    currentTier = "Diamond";
    tierName = "Kim Cương";
    tierIcon = "💎";
    nextTierName = "Tối Cao";
    minPoints = 1000;
    nextTierPoints = 1000;
    bgGradient =
      "from-cyan-950 via-slate-950 to-indigo-950 border-cyan-400/50 text-cyan-100 shadow-cyan-500/20";
    badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40";
    glowColor = "bg-cyan-500/20";
  } else if (points >= 300 || rankStr === "Gold") {
    currentTier = "Gold";
    tierName = "Vàng";
    tierIcon = "🥇";
    nextTierName = "Kim Cương";
    minPoints = 300;
    nextTierPoints = 1000;
    bgGradient =
      "from-amber-900/90 via-yellow-950 to-amber-800/80 border-amber-400/50 text-amber-100 shadow-amber-500/15";
    badgeColor = "bg-amber-400/20 text-amber-300 border-amber-400/40";
    glowColor = "bg-amber-400/20";
  } else if (points >= 100 || rankStr === "Silver") {
    currentTier = "Silver";
    tierName = "Bạc";
    tierIcon = "🥈";
    nextTierName = "Vàng";
    minPoints = 100;
    nextTierPoints = 300;
    bgGradient =
      "from-slate-800 via-slate-900 to-zinc-800 border-slate-400/40 text-slate-100 shadow-slate-500/10";
    badgeColor = "bg-slate-300/20 text-slate-200 border-slate-300/40";
    glowColor = "bg-slate-400/15";
  }

  const isMaxTier = currentTier === "Diamond";
  const progressPercent = isMaxTier
    ? 100
    : Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((points - minPoints) / (nextTierPoints - minPoints)) * 100,
          ),
        ),
      );
  const pointsToNext = Math.max(0, nextTierPoints - points);

  return {
    currentTier,
    tierName,
    tierIcon,
    nextTierName,
    nextTierPoints,
    progressPercent,
    pointsToNext,
    isMaxTier,
    bgGradient,
    badgeColor,
    glowColor,
  };
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

  // Reviewer Points & Rank
  const [reviewerProfile, setReviewerProfile] =
    useState<ReviewerProfileData | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  const [reviewerApp, setReviewerApp] =
    useState<ReviewerApplication | null>(null);
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

  const refreshReviewerSessionIfNeeded = useCallback(
    async (application: ReviewerApplication | null) => {
      const status = application?.status?.toLowerCase() ?? "";
      const isAccepted =
        application &&
        (status === "accept" ||
          status === "accepted" ||
          status === "approved");

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
    },
    [currentUser?.Role],
  );

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

  const loadPoints = useCallback(async () => {
    setIsLoadingPoints(true);
    try {
      const res = await getReviewerProfile();
      if (res) {
        setReviewerProfile(res);
      }
    } catch (error) {
      console.error("Không thể tải điểm Reviewer:", error);
    } finally {
      setIsLoadingPoints(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      await Promise.all([loadProfile(), loadPoints()]);

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
  }, [loadProfile, loadPoints, refreshReviewerSessionIfNeeded]);

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

    const invalidSocialLink = socialLinks.find(
      (value) => value && !/^https?:\/\/\S+$/i.test(value),
    );
    if (invalidSocialLink) {
      notify.error(
        "Liên kết mạng xã hội phải bắt đầu bằng http:// hoặc https://.",
      );
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

  const currentPoints = reviewerProfile?.reviewerPoints ?? 0;
  const currentRank = reviewerProfile?.reviewerRank || "Bronze";
  const rankInfo = getRankDetails(currentPoints, currentRank);

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
              onClick={() => {
                void loadProfile();
                void loadPoints();
              }}
              disabled={isLoading || isLoadingPoints}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading || isLoadingPoints ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
            <UserAccountMenu
              fallbackName={roleLabel}
              avatarUrl={displayedAvatarUrl}
            />
          </div>
        </div>

        {/* Hero Banner Box */}
        <div className="relative overflow-hidden rounded-[36px] border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-white via-cyan-50/50 to-slate-50 dark:bg-gradient-to-r dark:from-slate-950 dark:via-cyan-950/90 dark:to-slate-950 p-8 shadow-xl dark:shadow-2xl backdrop-blur-3xl mb-8 text-slate-950 dark:text-white transition-colors duration-300">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pt-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              {/* Avatar Frame */}
              <div className="relative group">
                <div className="h-32 w-32 overflow-hidden rounded-3xl border-2 border-cyan-500/30 dark:border-cyan-400/40 bg-slate-100 dark:bg-slate-800 shadow-xl shadow-cyan-500/10 dark:shadow-cyan-500/20">
                  {displayedAvatarUrl ? (
                    <img
                      src={displayedAvatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl font-black text-cyan-600 dark:text-cyan-300">
                      {getInitial(displayName)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                  {roleLabel} Account
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  {displayName}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-300">{email}</p>
              </div>
            </div>

            {profile?.createdAt && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm dark:shadow-none">
                <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Tham gia:{" "}
                {new Date(profile.createdAt).toLocaleDateString("vi-VN")}
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
                <BentoStatCard
                  icon={ShieldCheck}
                  label="Quyền tài khoản"
                  value={roleLabel}
                />
                <BentoStatCard
                  icon={Mail}
                  label="Email (Cố định)"
                  value={email}
                  isReadOnly
                />
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
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  UFind Account Security
                </h4>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Tài khoản được đồng bộ trực tiếp với hệ thống OAuth & JWT Token
                của UFind. Email của bạn là thông tin nhận dạng chính thức.
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
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Chỉnh sửa hồ sơ cá nhân
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cập nhật họ tên, số điện thoại và ảnh đại diện
                  </p>
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

          </div>

          {/* Reviewer Points & Rank Membership Section (FULL WIDTH) */}
          <div className="col-span-12 space-y-6">
            <div className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-500 border border-amber-500/30 shadow-inner">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Thẻ Thành Viên & Điểm Thưởng UFind
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                        1 điểm = 100đ
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tích lũy điểm khi Check-in tại bàn hoặc viết đánh giá để trừ trực tiếp vào hóa đơn ăn uống
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadPoints()}
                    disabled={isLoadingPoints}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isLoadingPoints ? "animate-spin" : ""}`}
                    />
                    Cập nhật điểm
                  </button>
                </div>
              </div>

              {/* VIP Card + Stats Showcase */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Metallic VIP Card */}
                <div className="lg:col-span-5 flex flex-col">
                  <div
                    className={`relative overflow-hidden rounded-3xl border p-6 md:p-7 shadow-2xl transition-all duration-300 flex-1 flex flex-col justify-between bg-gradient-to-br ${rankInfo.bgGradient}`}
                  >
                    {/* Atmospheric Glow */}
                    <div
                      className={`absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${rankInfo.glowColor}`}
                    />

                    {/* Card Header */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-10 rounded-lg bg-gradient-to-tr from-amber-300/40 via-yellow-200/60 to-amber-400/30 border border-yellow-200/50 flex items-center justify-center shadow-inner">
                          <div className="h-4 w-6 border border-yellow-100/40 rounded-sm" />
                        </div>
                        <span className="font-mono text-xs font-black tracking-widest text-white/80 uppercase">
                          UFIND PASS
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border backdrop-blur-md ${rankInfo.badgeColor}`}
                      >
                        <span>{rankInfo.tierIcon}</span>
                        <span>Hạng {rankInfo.tierName}</span>
                      </span>
                    </div>

                    {/* Card Body - Balance */}
                    <div className="relative my-8">
                      <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                        Số dư khả dụng
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                          {currentPoints.toLocaleString("vi-VN")}
                        </span>
                        <span className="text-base font-bold text-amber-300">
                          Điểm
                        </span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-black/40 border border-white/10 px-3 py-1 text-xs font-mono font-bold text-emerald-300 backdrop-blur-md">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        Trừ ngay = {(currentPoints * 100).toLocaleString("vi-VN")} đ khi gọi món
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="relative flex items-end justify-between border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">
                          Thành viên
                        </p>
                        <p className="text-xs font-black text-white tracking-wide truncate max-w-[180px]">
                          {displayName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">
                          Quy chuẩn
                        </p>
                        <p className="text-xs font-mono font-bold text-cyan-300">
                          1 Point = 100 VNĐ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rank Progression & Perks */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  {/* Progress to next Tier */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-5">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                        Tiến trình lên hạng:{" "}
                        <span className="text-cyan-600 dark:text-cyan-400 font-black">
                          {rankInfo.tierName}
                        </span>
                        {!rankInfo.isMaxTier && (
                          <>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-amber-500 font-black">
                              {rankInfo.nextTierName}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        {rankInfo.isMaxTier
                          ? "Hạng Tối Đa"
                          : `${currentPoints} / ${rankInfo.nextTierPoints} Điểm`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-amber-500 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${rankInfo.progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>
                        {rankInfo.tierIcon} {rankInfo.tierName}
                      </span>
                      {!rankInfo.isMaxTier ? (
                        <span>
                          Cần thêm{" "}
                          <strong className="text-amber-500">
                            {rankInfo.pointsToNext} điểm
                          </strong>{" "}
                          để lên hạng {rankInfo.nextTierName}
                        </span>
                      ) : (
                        <span className="text-cyan-400 font-bold">
                          🎉 Đang sở hữu cấp bậc VIP Kim Cương
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 Steps to Earn Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs mb-1">
                        <QrCode className="h-4 w-4" />
                        <span>Check-in Bàn</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Quét QR tại bàn ăn
                      </p>
                      <p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +10 Điểm
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">
                        <Star className="h-4 w-4" />
                        <span>Đánh giá quán</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Kèm ảnh chụp món ăn
                      </p>
                      <p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +15 ~ 20 Điểm
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1">
                        <Gift className="h-4 w-4" />
                        <span>Trừ tiền bill</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Chọn dùng điểm khi order
                      </p>
                      <p className="mt-2 text-xs font-black text-cyan-600 dark:text-cyan-400">
                        1đ = 100 VNĐ
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="mt-8 border-t border-slate-200/80 dark:border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-400" />
                    Lịch sử giao dịch điểm thưởng
                  </h4>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {reviewerProfile?.pointTransactions?.length ?? 0} giao dịch
                    gần nhất
                  </span>
                </div>

                {isLoadingPoints ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
                    <p className="mt-2 text-xs font-bold">
                      Đang tải lịch sử giao dịch...
                    </p>
                  </div>
                ) : !reviewerProfile?.pointTransactions ||
                  reviewerProfile.pointTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center">
                    <Coins className="mx-auto h-8 w-8 text-slate-400/60 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Chưa có lịch sử giao dịch điểm
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Hãy quét mã QR tại bàn khi ghé quán ăn hoặc viết đánh giá
                      chân thực để nhận ngay những điểm thưởng đầu tiên!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                          <th className="pb-3 font-bold">Loại giao dịch</th>
                          <th className="pb-3 font-bold">Nội dung</th>
                          <th className="pb-3 font-bold text-right">Số điểm</th>
                          <th className="pb-3 font-bold text-right">
                            Số dư sau
                          </th>
                          <th className="pb-3 font-bold text-right">
                            Thời gian
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                        {reviewerProfile.pointTransactions.map((tx) => {
                          const isPositive = tx.amount > 0;
                          return (
                            <tr
                              key={tx.id}
                              className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="py-3.5 pr-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono ${
                                    isPositive
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  }`}
                                >
                                  {isPositive ? (
                                    <Sparkles className="h-3 w-3" />
                                  ) : (
                                    <Gift className="h-3 w-3" />
                                  )}
                                  {tx.type === "CHECK_IN"
                                    ? "CHECK-IN BÀN"
                                    : tx.type === "REVIEW"
                                      ? "ĐÁNH GIÁ QUÁN"
                                      : tx.type === "REVIEW_PHOTO"
                                        ? "REVIEW KÈM ẢNH"
                                        : tx.type === "POINT_REDEMPTION"
                                          ? "ĐỔI ĐIỂM TRỪ BILL"
                                          : tx.type}
                                </span>
                              </td>
                              <td className="py-3.5 pr-2 text-slate-700 dark:text-slate-200 font-bold max-w-xs truncate">
                                {tx.reason ||
                                  (isPositive
                                    ? "Thưởng tương tác UFind"
                                    : "Giảm giá hóa đơn món")}
                              </td>
                              <td
                                className={`py-3.5 text-right font-black font-mono ${
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isPositive ? `+${tx.amount}` : tx.amount} đ
                              </td>
                              <td className="py-3.5 text-right font-mono font-bold text-slate-500 dark:text-slate-400">
                                {tx.pointsAfter?.toLocaleString("vi-VN") ?? "-"}{" "}
                                đ
                              </td>
                              <td className="py-3.5 text-right font-mono text-[11px] text-slate-400">
                                {new Date(tx.createdAt).toLocaleString(
                                  "vi-VN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  },
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column Bottom: Reviewer Program Application Section */}
          {reviewerApp && isReviewerAccepted && (
            <div className="col-span-12 rounded-3xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-6 shadow-xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Đơn Reviewer đã được chấp nhận!
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Tài khoản của bạn đã được nâng cấp chính thức thành
                      Reviewer trên UFind.
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
                      {reviewerApp
                        ? "Hồ sơ Reviewer (Đang chờ duyệt)"
                        : "Trở thành Reviewer chính thức"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                      Đánh giá món ăn, nhận mã giới thiệu và tích lũy phần thưởng
                      độc quyền từ UFind.
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
            <div className="col-span-12 rounded-3xl border border-cyan-500/30 bg-white/90 p-8 shadow-2xl backdrop-blur-3xl dark:bg-slate-900/80">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Đơn đăng ký Reviewer
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Chia sẻ lý do và ít nhất một kênh mạng xã hội để Staff xét
                    duyệt hồ sơ.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewerForm(false)}
                  className="h-9 rounded-xl border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Đóng
                </Button>
              </div>

              <form
                onSubmit={handleReviewerApplicationSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
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
                    id="reviewer-motivation"
                    maxLength={3000}
                    className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    placeholder="Ví dụ: Tôi thường chia sẻ trải nghiệm món ăn và muốn đóng góp các đánh giá hữu ích cho cộng đồng..."
                    aria-describedby="reviewer-motivation-hint"
                    disabled={isSubmittingReviewerApp}
                  />
                  <p
                    id="reviewer-motivation-hint"
                    className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    Tối đa 3.000 ký tự.
                  </p>
                </div>

                <ReviewerInput
                  label="Kinh nghiệm (không bắt buộc)"
                  placeholder="Ví dụ: 2 năm viết review ẩm thực"
                  value={reviewerForm.experience}
                  onChange={(v) =>
                    setReviewerForm((p) => ({ ...p, experience: v }))
                  }
                  disabled={isSubmittingReviewerApp}
                />
                <ReviewerInput
                  label="Liên kết Facebook"
                  placeholder="https://facebook.com/ten-cua-ban"
                  type="url"
                  value={reviewerForm.facebookUrl}
                  onChange={(v) =>
                    setReviewerForm((p) => ({ ...p, facebookUrl: v }))
                  }
                  disabled={isSubmittingReviewerApp}
                />
                <ReviewerInput
                  label="Liên kết TikTok"
                  placeholder="https://tiktok.com/@ten-cua-ban"
                  type="url"
                  value={reviewerForm.tiktokUrl}
                  onChange={(v) =>
                    setReviewerForm((p) => ({ ...p, tiktokUrl: v }))
                  }
                  disabled={isSubmittingReviewerApp}
                />
                <ReviewerInput
                  label="Liên kết YouTube"
                  placeholder="https://youtube.com/@kenh-cua-ban"
                  type="url"
                  value={reviewerForm.youtubeUrl}
                  onChange={(v) =>
                    setReviewerForm((p) => ({ ...p, youtubeUrl: v }))
                  }
                  disabled={isSubmittingReviewerApp}
                />
                <ReviewerInput
                  label="Liên kết khác"
                  placeholder="https://instagram.com/ten-cua-ban"
                  type="url"
                  icon={<Instagram className="h-4 w-4" />}
                  value={reviewerForm.otherSocialUrl}
                  onChange={(v) =>
                    setReviewerForm((p) => ({ ...p, otherSocialUrl: v }))
                  }
                  disabled={isSubmittingReviewerApp}
                />

                <div className="sm:col-span-2 flex justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={isSubmittingReviewerApp}
                    className="h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 font-black text-white shadow-lg shadow-cyan-600/25 hover:from-cyan-500 hover:to-blue-500"
                  >
                    {isSubmittingReviewerApp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
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
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          {isReadOnly && <Lock className="h-3 w-3 text-slate-400" />}
        </div>
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function ReviewerInput({
  label,
  placeholder,
  type = "text",
  icon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  type?: "text" | "url";
  icon?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600 dark:text-cyan-400">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white ${icon ? "pl-11" : ""}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
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
