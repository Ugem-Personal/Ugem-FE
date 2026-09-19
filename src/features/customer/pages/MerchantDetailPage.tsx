import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Heart,
  Star,
  MapPin,
  Phone,
  Mail,
  Flame,
  Search,
  Utensils,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSafeBack } from "@/shared/hooks/useSafeBack";

import {
  getReviewsByMerchantId,
  type Review,
} from "@/features/review/services";

import {
  getMerchantDetail,
  incrementMerchantView,
} from "../services/merchantService";

import type {
  MerchantDetail,
} from "../types";

import { getWishlist } from "../services/wishlistService";
import { notify } from "@/shared/lib/notify";
import { getCurrentUser } from "@/features/auth";
import { getMerchantOpenStatus } from "@/shared/utils/openingHours";
import { BrandLogo, ImageWithFallback, UserAccountMenu } from "@/shared/components";
import { Button } from "@/shared/components/ui/button";
import { WishlistButton } from "../components/WishlistButton";

import {
  reportMerchantIncident,
  type IncidentSeverity,
  type IncidentType,
} from "@/features/moderation/services";

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

const viewedMerchantIds = new Set<string>();

async function trackMerchantViewOnce(merchantId: string) {
  if (viewedMerchantIds.has(merchantId)) return;

  viewedMerchantIds.add(merchantId);

  try {
    await incrementMerchantView(merchantId);
  } catch (error) {
    viewedMerchantIds.delete(merchantId);
    console.error(error);
  }
}

function getReviewContent(review: Review) {
  return review.content || "";
}

function getReviewAuthorName(review: Review) {
  return review.customerName || "Khách hàng UFind";
}

function getReviewAuthorAvatarUrl(review: Review) {
  return review.customerAvatarUrl || "";
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "UG"
  );
}

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function parseMerchantDescription(description?: string) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const markerIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("thông tin ui bổ sung"),
  );

  const isMetaLine = (line: string) =>
    DESCRIPTION_META_LABELS.some((label) =>
      line.toLowerCase().startsWith(`${label.toLowerCase()}:`),
    );

  const isUiMarkerLine = (line: string) =>
    line.toLowerCase().includes("thông tin ui bổ sung");

  const summaryLines =
    markerIndex >= 0
      ? lines.slice(0, markerIndex)
      : lines.filter((line) => !isMetaLine(line) && !isUiMarkerLine(line));

  const metaLines =
    markerIndex >= 0
      ? lines.slice(markerIndex + 1)
      : lines.filter((line) => isMetaLine(line));

  const facts = metaLines
    .map((line) => {
      const [label, ...valueParts] = line.split(":");
      return {
        label: label.trim(),
        value: valueParts.join(":").trim(),
      };
    })
    .filter((item) => item.label && item.value);

  return {
    summary: summaryLines.join("\n").trim(),
    facts,
  };
}

function formatRating(value: number) {
  return value.toFixed(2);
}

export default function MerchantDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? undefined;

  const navigate = useNavigate();
  const safeBack = useSafeBack("/customer");
  const handleBack = () => {
    const backTo = searchParams.get("backTo");
    if (backTo) {
      navigate(backTo, { replace: true });
      return;
    }

    safeBack();
  };
  const currentUser = getCurrentUser();

  const reviewSectionRef = useRef<HTMLElement | null>(null);

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [foodSearchKeyword, setFoodSearchKeyword] = useState("");
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("");

  const [showReviews, setShowReviews] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showReportForm, setShowReportForm] = useState(false);

  const [reportType, setReportType] = useState<IncidentType>("Other");

  const [reportSeverity, setReportSeverity] =
    useState<IncidentSeverity>("Medium");

  const [reportDescription, setReportDescription] = useState("");

  const [reportLoading, setReportLoading] = useState(false);

  const [reportError, setReportError] = useState("");

  const [reportSuccess, setReportSuccess] = useState("");

  const menuItems = useMemo(
    () => merchant?.menu || merchant?.foods || [],
    [merchant],
  );

  const foodCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    menuItems.forEach((item) => {
      item.categoryDetail?.forEach((cat) => categoriesSet.add(cat));
    });
    return Array.from(categoriesSet);
  }, [menuItems]);

  const hasCombos = useMemo(
    () => menuItems.some((item) => item.isCombo),
    [menuItems],
  );

  const comboCount = useMemo(
    () => menuItems.filter((item) => item.isCombo).length,
    [menuItems],
  );

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((food) => {
      const matchesKeyword =
        !foodSearchKeyword.trim() ||
        food.name
          .toLowerCase()
          .includes(foodSearchKeyword.trim().toLowerCase()) ||
        (food.description ?? "")
          .toLowerCase()
          .includes(foodSearchKeyword.trim().toLowerCase()) ||
        (food.comboItems &&
          food.comboItems.some((ci) =>
            ci.food?.name
              ?.toLowerCase()
              .includes(foodSearchKeyword.trim().toLowerCase()),
          ));

      const matchesCategory =
        !selectedFoodCategory ||
        (selectedFoodCategory === "combo"
          ? food.isCombo === true
          : food.categoryDetail?.includes(selectedFoodCategory));

      return matchesKeyword && matchesCategory;
    });
  }, [menuItems, foodSearchKeyword, selectedFoodCategory]);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);

      try {
        const [merchantData, reviewData] = await Promise.all([
          getMerchantDetail(id!),
          getReviewsByMerchantId(id!),
        ]);

        setMerchant(merchantData);
        setReviews(reviewData);
        void trackMerchantViewOnce(id!);
      } catch (error) {
        console.error(error);
        notify.error("Không tải được chi tiết quán.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  useEffect(() => {
    if (!id || !currentUser) return;
    getWishlist()
      .then((items) => {
        const exists = items.some(
          (item) => (item.merchantId || item.id) === id,
        );
        setIsWishlisted(exists);
      })
      .catch(() => undefined);
  }, [id, currentUser]);

  useEffect(() => {
    if (!showReviews) return;

    reviewSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [showReviews]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800 shadow-xl" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800 shadow-lg"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center transition-colors duration-300">
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-10 shadow-2xl">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">
            Không tìm thấy quán
          </h2>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Merchant này có thể đã bị xoá hoặc không tồn tại.
          </p>

          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const name = merchant.name || "Unnamed merchant";
  const openStatus = getMerchantOpenStatus(merchant.openingHours);
  const descriptionInfo = parseMerchantDescription(merchant.description);
  const visibleFacts = descriptionInfo.facts.filter(
    (item) => item.label.toLowerCase() !== "địa chỉ",
  );
  const reviewCount = reviews.length;
  const reviewAverage =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
        reviewCount
      : null;
  const displayRating =
    reviewAverage && reviewAverage > 0
      ? reviewAverage
      : typeof merchant.rating === "number" && merchant.rating > 0
        ? merchant.rating
        : null;

  const handleReportMerchant = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!id) {
      setReportError("Không tìm thấy thông tin quán.");
      return;
    }

    if (reportDescription.trim().length < 10) {
      setReportError("Mô tả phải có ít nhất 10 ký tự.");
      return;
    }

    setReportLoading(true);
    setReportError("");
    setReportSuccess("");

    try {
      await reportMerchantIncident({
        merchantId: id,
        type: reportType,
        severity: reportSeverity,
        description: reportDescription.trim(),
      });

      setReportSuccess("Báo cáo đã được gửi thành công.");

      setReportDescription("");
      setReportType("Other");
      setReportSeverity("Medium");

      setTimeout(() => {
        setShowReportForm(false);
        setReportSuccess("");
      }, 1500);
    } catch (error) {
      console.error(error);

      setReportError("Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 pt-6 pb-12 font-sans text-slate-950 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-40 -mx-4 -mt-6 mb-6 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
        <div className="mx-auto flex h-20 max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/customer" className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-9 sm:h-10 w-auto shrink-0 transition-transform hover:scale-105" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              asChild
              type="button"
              variant="outline"
              className="h-10 sm:h-11 gap-1.5 sm:gap-2 rounded-xl border-rose-200 dark:border-rose-400/30 bg-white dark:bg-slate-900 px-2.5 sm:px-4 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 shadow-sm transition hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
            >
              <Link to="/customer/wishlist" aria-label="Quán yêu thích">
                <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                <span className="hidden md:inline">Quán yêu thích</span>
              </Link>
            </Button>
            <UserAccountMenu fallbackName="Customer" />
          </div>
        </div>
      </header>

      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 dark:bg-amber-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Top Header Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        </div>

        {/* Merchant Hero Banner */}
        <section
          data-campaign-id={campaignId}
          className="relative overflow-hidden rounded-3xl border border-cyan-200/80 dark:border-white/10 bg-gradient-to-br from-white via-cyan-50/60 to-blue-50/40 dark:from-slate-950 dark:via-cyan-950 dark:to-slate-950 text-slate-900 dark:text-white shadow-2xl p-6 sm:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.12),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.25),transparent_50%)] pointer-events-none" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-100/70 dark:border-cyan-400/30 dark:bg-cyan-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-800 dark:text-cyan-300 backdrop-blur-md shadow-2xs">
                <Flame className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />{" "}
                Premium Merchant
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl leading-tight text-slate-950 dark:text-white">
                {name}
              </h1>

              {merchant.address && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                  {merchant.address}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReviews(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300/80 dark:border-amber-400/40 bg-amber-50/80 dark:bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-800 dark:text-amber-300 backdrop-blur-md transition hover:bg-amber-100 dark:hover:bg-amber-400/20 shadow-2xs cursor-pointer"
                >
                  <Star
                    className={
                      displayRating
                        ? "h-4 w-4 fill-amber-400 text-amber-500"
                        : "h-4 w-4 text-amber-400/50"
                    }
                  />
                  {displayRating
                    ? `Đánh giá ${formatRating(displayRating)} ★${reviewCount > 0 ? ` (${reviewCount} đánh giá)` : ""}`
                    : "Chưa có đánh giá"}
                </button>

                {merchant.phone && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-md shadow-2xs">
                    <Phone className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    {merchant.phone}
                  </span>
                )}

                {merchant.email && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-md shadow-2xs">
                    <Mail className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    {merchant.email}
                  </span>
                )}

                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold backdrop-blur-md shadow-2xs",
                    openStatus.isOpen
                      ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : "border-rose-300/80 bg-rose-50/90 text-rose-800 dark:border-rose-400/50 dark:bg-rose-500/20 dark:text-rose-200",
                  )}
                  title={
                    merchant.openingHours
                      ? `Giờ mở cửa: ${merchant.openingHours}`
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      openStatus.isOpen
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-rose-500",
                    )}
                  />
                  {openStatus.statusText}
                  {merchant.openingHours && ` (${merchant.openingHours})`}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-400/20 dark:bg-rose-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">Báo cáo vấn đề</h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Báo cáo an toàn thực phẩm, vệ sinh, gian lận hoặc thông tin sai.</p>
                  </div>
                  <button type="button" onClick={() => { setShowReportForm((value) => !value); setReportError(""); }} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500">
                    {showReportForm ? "Đóng biểu mẫu" : "Báo cáo quán"}
                  </button>
                </div>
                {showReportForm && <form onSubmit={handleReportMerchant} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select value={reportType} onChange={(event) => setReportType(event.target.value as IncidentType)} className="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900">
                    <option value="FoodSafety">An toàn thực phẩm</option><option value="Hygiene">Vệ sinh</option><option value="Fraud">Gian lận</option><option value="WrongInformation">Thông tin sai</option><option value="BadService">Dịch vụ không tốt</option><option value="Other">Khác</option>
                  </select>
                  <select value={reportSeverity} onChange={(event) => setReportSeverity(event.target.value as IncidentSeverity)} className="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900">
                    <option value="Low">Thấp</option><option value="Medium">Trung bình</option><option value="High">Cao</option><option value="Critical">Nghiêm trọng</option>
                  </select>
                  <textarea required minLength={10} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Mô tả vấn đề (ít nhất 10 ký tự)" className="min-h-24 rounded-lg border bg-white px-3 py-2 text-sm sm:col-span-2 dark:bg-slate-900" />
                  {reportError && <p className="text-sm text-rose-700 sm:col-span-2">{reportError}</p>}
                  {reportSuccess && <p className="text-sm text-emerald-700 sm:col-span-2">{reportSuccess}</p>}
                  <button disabled={reportLoading} type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{reportLoading ? "Đang gửi..." : "Gửi báo cáo"}</button>
                </form>}
              </div>

              {descriptionInfo.summary && (
                <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                  {descriptionInfo.summary}
                </p>
              )}

              {visibleFacts.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {visibleFacts.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex items-center rounded-full border border-cyan-300/80 dark:border-cyan-400/20 bg-cyan-50/80 dark:bg-cyan-400/10 px-3.5 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-200 shadow-2xs"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/customer?tab=map&merchantId=${merchant.id}`)
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              >
                <Navigation className="h-4 w-4" />
                Chỉ đường (VietMap)
              </button>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    merchantId: merchant.id,
                  });
                  if (campaignId) params.set("campaignId", campaignId);
                  navigate(`/customer/check-in?${params.toString()}`);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Check-in tại quán
              </button>
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("menu-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 px-5 text-xs font-black text-white dark:text-slate-950 shadow-lg shadow-cyan-600/20 active:scale-95 transition cursor-pointer"
              >
                <Utensils className="h-4 w-4" />
                Xem thực đơn
              </button>
              <WishlistButton
                merchantId={merchant.id}
                initialSaved={isWishlisted}
                variant="full"
                size="lg"
                onToggleSuccess={(nextSaved) => setIsWishlisted(nextSaved)}
              />
            </div>
          </div>
        </section>

        {!openStatus.isOpen && (
          <div className="mt-6 rounded-3xl border border-rose-300/80 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/30 p-5 flex items-start gap-3.5 shadow-lg backdrop-blur-md">
            <Clock className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-950 dark:text-rose-200">
                Nhà hàng hiện đang đóng cửa (
                {merchant.openingHours || "Ngoài giờ hoạt động"})
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                Quán hiện đang đóng cửa. Bạn vẫn có thể xem trước thực đơn bên
                dưới và ghé quán khi quán mở cửa nhé!
              </p>
            </div>
          </div>
        )}

        {/* Menu Section */}
        <section id="menu-section" className="mt-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Recommended Menu
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Thực đơn tham khảo
              </h2>
            </div>

            {/* Food Search & Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={foodSearchKeyword}
                  onChange={(e) => setFoodSearchKeyword(e.target.value)}
                  placeholder="Tìm món trong thực đơn..."
                  className="h-10 w-full sm:w-64 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 pl-10 pr-4 text-xs font-bold text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {(foodCategories.length > 0 || hasCombos) && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedFoodCategory("")}
                className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition ${
                  !selectedFoodCategory
                    ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                    : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400"
                }`}
              >
                Tất cả ({menuItems.length})
              </button>

              {hasCombos && (
                <button
                  onClick={() => setSelectedFoodCategory("combo")}
                  className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition flex items-center gap-1.5 ${
                    selectedFoodCategory === "combo"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:border-amber-400"
                  }`}
                >
                  <span>🔥 Combo Tiết Kiệm</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      selectedFoodCategory === "combo"
                        ? "bg-white/20 text-white"
                        : "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {comboCount}
                  </span>
                </button>
              )}

              {foodCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFoodCategory(cat)}
                  className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition ${
                    selectedFoodCategory === cat
                      ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                      : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-sm font-bold text-amber-900 dark:text-amber-300 shadow-2xs">
            <Utensils className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Đây là menu tham khảo để bạn khám phá quán trước khi ghé. Khi đến
              nơi, hãy check-in để ghi nhận lượt ghé thăm của bạn.
            </span>
          </div>

          {filteredMenuItems.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {filteredMenuItems.map((food) => (
                <article
                  key={food.id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-cyan-400 dark:hover:border-cyan-500/50 backdrop-blur-md"
                >
                  <div className="relative flex gap-4 sm:gap-5">
                    <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-inner">
                      <ImageWithFallback
                        src={food.imageUrl}
                        alt={food.name}
                        fallbackIcon={<Flame className="h-6 w-6 text-cyan-400" />}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {food.isCombo && (
                        <span className="absolute top-1.5 left-1.5 rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                          COMBO
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <h3 className="line-clamp-2 text-base font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {food.name}
                        </h3>
                        {food.description && (
                          <p className="mt-1 line-clamp-3 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            {food.description}
                          </p>
                        )}
                      </div>

                      <p className="mt-3 text-base font-black tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                        {formatPrice(food.price)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 p-10 text-center shadow-2xs">
              <Flame className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                Không tìm thấy món ăn
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Thử thay đổi từ khóa tìm kiếm món ăn hoặc chọn danh mục khác.
              </p>
            </div>
          )}
        </section>

        {/* Reviews Section */}
        {showReviews && (
          <section
            ref={reviewSectionRef}
            id="review-section"
            className="mt-10 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs"
          >
            <div className="mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Customer Reviews
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Đánh giá từ khách hàng
              </h2>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div
                    key={review.reviewId || `${review.createdAt}-${index}`}
                    className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 p-5"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 dark:bg-cyan-950 text-xs font-black text-cyan-800 dark:text-cyan-300">
                        {getReviewAuthorAvatarUrl(review) ? (
                          <img
                            src={getReviewAuthorAvatarUrl(review)}
                            alt={getReviewAuthorName(review)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(getReviewAuthorName(review))
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {getReviewAuthorName(review)}
                          </p>
                          {review.isVerifiedDiner && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Đã ăn tại
                              quán
                            </span>
                          )}
                        </div>
                        {review.createdAt ? (
                          <p className="text-xs font-semibold text-slate-400">
                            {new Date(review.createdAt).toLocaleString("vi-VN")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {review.rating && review.rating > 0 ? (
                      <div className="mb-2 flex items-center gap-1 text-amber-500">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className="fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                    ) : null}

                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {getReviewContent(review) || "Không có nội dung."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                Chưa có đánh giá nào cho quán này.
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
