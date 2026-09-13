import { useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { cleanAddress } from "@/shared/utils/address";
import { Link } from "react-router-dom";
import {
  Clock3,
  MapPin,
  Pencil,
  Phone,
  Save,
  Star,
  Store,
  X,
  ImagePlus,
  Loader2,
  Mail,
  UtensilsCrossed,
  Tag,
  DollarSign,
  Compass,
  MessageSquare,
  QrCode,
  Trash2,
  AlertCircle,
} from "lucide-react";

import { TableQrGeneratorModal } from "../components/TableQrGeneratorModal";
import { RestaurantAddressPicker } from "../components/RestaurantAddressPicker";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import { getMapMerchants, getMerchantDetail } from "@/features/customer/services/merchantService";
import type { MerchantDetail } from "@/features/customer/types";
import { getReviewsByMerchantId, type Review } from "@/features/review/services";
import {
  getMyMerchantDetail,
  updateMerchant,
} from "../services";
import { useMyApplications } from "../hooks/useMyApplications";
import type { MerchantApplication } from "../types";
import { MerchantStatusBadge, ImageWithFallback } from "@/shared/components";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";


type MerchantEditForm = {
  merchantName: string;
  merchantDescription: string;
  restaurantType: string;
  mainDishType: string;
  priceRange: string;
  email: string;
  phone: string;
  address: string;
  openingHours: string;
  logoUrl: string;
  latitude?: number | null;
  longitude?: number | null;
};

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Nhóm món chủ đạo",
  "Khoảng giá trung bình",
  "Loại hình ẩm thực",
  "Ẩm thực",
  "Người đại diện",
  "Số CCCD",
  "Căn cước",
  "Số CCCD / Hộ chiếu",
  "Loại giấy tờ định danh",
  "Mã số thuế",
  "Mã số thuế doanh nghiệp",
  "Ảnh mặt trước",
  "Ảnh mặt sau",
  "Giấy chứng nhận",
  "Ảnh không gian quán",
  "Giấy phép KD",
  "Mã số GPKD",
];

function getDisplayDescription(description?: string): string {
  if (!description) return "";

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Cutoff at first section delimiter or legal / technical marker
  const markerIndex = lines.findIndex((line) => {
    const lower = line.toLowerCase();
    return (
      lower.startsWith("---") ||
      lower.includes("thông tin pháp lý") ||
      lower.includes("định danh (kyc)") ||
      lower.includes("thông tin kyc") ||
      lower.includes("thông tin ui bổ sung")
    );
  });

  const rawLines = markerIndex >= 0 ? lines.slice(0, markerIndex) : lines;

  const cleanLines = rawLines.filter((line) => {
    const lower = line.toLowerCase();
    // Exclude URLs or image paths
    if (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.includes("res.cloudinary.com")
    ) {
      return false;
    }
    // Exclude horizontal lines or dividers
    if (
      lower.startsWith("---") ||
      lower.endsWith("---") ||
      lower.startsWith("___")
    ) {
      return false;
    }
    // Exclude metadata headers
    if (
      DESCRIPTION_META_LABELS.some((label) =>
        lower.startsWith(`${label.toLowerCase()}:`),
      )
    ) {
      return false;
    }
    return true;
  });

  return cleanLines.join("\n").trim();
}

function getReviewAuthorName(review: Review) {
  return (
    review.customerName ||
    review.name ||
    review.title ||
    "Thực khách ẩn danh"
  );
}

function getReviewAuthorAvatarUrl(review: Review) {
  return review.customerAvatarUrl || review.imageUrl || null;
}

function getInitials(name?: string) {
  if (!name) return "KH";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STANDARD_RESTAURANT_TYPES = [
  "Quán ăn bình dân",
  "Quán ăn gia đình",
  "Quán vỉa hè / Đường phố",
  "Nhà hàng / Quán máy lạnh",
  "Quán Cafe / Trà sữa / Đồ uống",
  "Quán nhậu / Lai rai",
  "Kiot / Xe đẩy / Bán mang đi",
];

const STANDARD_MAIN_DISH_TYPES = [
  "Cơm (Cơm tấm, Cơm văn phòng, Cơm gà)",
  "Bún, Phở, Mì & Hủ tiếu",
  "Món Việt truyền thống (Mâm cơm, Đặc sản)",
  "Bánh mì & Thức ăn nhanh (Xôi, Bánh mì, Burger)",
  "Đồ ăn vặt & Tráng miệng (Chè, Bánh tráng, Kem)",
  "Trà sữa, Cà phê & Đồ uống",
  "Lẩu & Đồ nướng",
  "Món Chay & Thực dưỡng",
  "Món Hàn / Nhật / Thái",
  "Món Âu (Pizza, Pasta, Steak)",
  "Món khác",
];

const STANDARD_PRICE_RANGES = [
  "Tự động tính theo giá thực đơn",
  "Dưới 35.000đ (Bình dân / Học sinh, sinh viên)",
  "35.000đ - 75.000đ (Phổ thông / Dân văn phòng)",
  "75.000đ - 150.000đ (Tầm trung / Gia đình, họp mặt)",
  "Trên 150.000đ (Cao cấp / Nhà hàng sang trọng)",
];

function toEditForm(merchant?: MerchantDetail | null): MerchantEditForm {
  let restaurantType = merchant?.restaurantType ?? "";
  let mainDishType = merchant?.mainDishType ?? "";
  let priceRange = merchant?.priceRange ?? "";

  // Normalize if restaurantType was old cuisine like "Cơm & Món Việt"
  if (
    restaurantType === "Cơm & Món Việt" ||
    restaurantType === "Cơm" ||
    restaurantType.toLowerCase().includes("món việt")
  ) {
    if (!mainDishType || mainDishType === "Món đặc trưng" || mainDishType === "Món chính") {
      mainDishType = "Cơm (Cơm tấm, Cơm văn phòng, Cơm gà)";
    }
    restaurantType = "Quán ăn bình dân";
  } else if (!restaurantType) {
    restaurantType = "Quán ăn bình dân";
  }

  // Normalize if mainDishType was "Món đặc trưng" or "Món chính"
  if (mainDishType === "Món đặc trưng" || mainDishType === "Món chính") {
    mainDishType = "Cơm (Cơm tấm, Cơm văn phòng, Cơm gà)";
  }

  // Normalize priceRange: if empty or includes "Tự động"
  if (!priceRange || priceRange.toLowerCase().includes("tự động")) {
    priceRange = "Tự động tính theo giá thực đơn";
  }

  return {
    merchantName: merchant?.name ?? "",
    merchantDescription: getDisplayDescription(merchant?.description),
    restaurantType,
    mainDishType,
    priceRange,
    email: merchant?.email ?? "",
    phone: merchant?.phone ?? "",
    address: merchant?.address ?? "",
    openingHours: merchant?.openingHours ?? "",
    logoUrl: merchant?.logoUrl ?? "",
    latitude: merchant?.latitude ?? (merchant?.lat ?? undefined),
    longitude: merchant?.longitude ?? (merchant?.lng ?? undefined),
  };
}

function isApprovedStatus(status?: string) {
  return status === "Approved" || status === "Accepted" || status === "Accept";
}

function applicationToMerchantDetail(
  application: MerchantApplication,
): MerchantDetail {
  const menu = (application.applicationMenus ?? []).map((item, index) => ({
    id: item.id ?? `${application.id}-${index}`,
    foodId: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    imageUrl: item.imageUrl,
    categoryDetail: [item.category, item.cuisine].filter(
      (value): value is string => Boolean(value),
    ),
  }));

  return {
    id: application.id,
    name: application.name,
    description: application.description,
    address: application.address,
    email: application.email,
    phone: application.phone,
    logoUrl: application.logoUrl,
    openingHours: application.openingHours,
    rating: 0,
    reviewCount: 0,
    underratedScore: 0,
    latitude: application.latitude,
    longitude: application.longitude,
    status: application.status,
    menu,
    foods: menu,
  };
}

async function resolveMerchantFromApprovedApplication(
  application: MerchantApplication,
): Promise<MerchantDetail> {
  const merchants = await getMapMerchants({
    MinLongitude: -180,
    MaxLongitude: 180,
    MinLatitude: -90,
    MaxLatitude: 90,
    ZoomLevel: 20,
  });

  const normalizedName = (application.name || "").trim().toLowerCase();
  const normalizedAddress = (application.address || "").trim().toLowerCase();

  const matchedMerchant = merchants.find((m: { name?: string; address?: string; id: string }) => {
    const mName = (m.name || "").trim().toLowerCase();
    const mAddress = (m.address || "").trim().toLowerCase();

    if (!normalizedName) return false;

    return (
      mName === normalizedName ||
      mName.includes(normalizedName) ||
      (normalizedAddress && mAddress === normalizedAddress)
    );
  });

  if (matchedMerchant) {
    try {
      return await getMerchantDetail(matchedMerchant.id);
    } catch (error) {
      console.error(error);
    }
  }

  return applicationToMerchantDetail(application);
}

export function MerchantRestaurantPage() {
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const reviewsRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<MerchantEditForm>(() => toEditForm(null));
  const { data: applications = [], isLoading: isLoadingApplications } =
    useMyApplications();

  const latestApprovedApplication = useMemo(
    () =>
      [...applications].find((application) =>
        isApprovedStatus(application.status),
      ) ?? null,
    [applications],
  );
  const displayDescription = useMemo(
    () => getDisplayDescription(merchant?.description),
    [merchant?.description],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        let data: MerchantDetail | null = null;

        try {
          data = await getMyMerchantDetail();
        } catch {
          if (latestApprovedApplication) {
            data = await resolveMerchantFromApprovedApplication(
              latestApprovedApplication,
            );
          }
        }

        if (active) {
          setMerchant(data);
          setForm(toEditForm(data));
        }

        if (data?.id) {
          setLoadingReviews(true);
          try {
            const reviewList = await getReviewsByMerchantId(data.id);
            if (active) {
              setReviews(reviewList);
            }
          } catch (err) {
            console.error("Không tải được danh sách đánh giá:", err);
          } finally {
            if (active) {
              setLoadingReviews(false);
            }
          }
        }
      } catch (error) {
        console.error(error);
        notify.error("Không tải được thông tin nhà hàng.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [latestApprovedApplication]);

  const menu = merchant?.menu ?? merchant?.foods ?? [];

  const menuPriceRange = useMemo(() => {
    const validPrices = menu
      .map((m) => Number(m.price))
      .filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length === 0) return null;
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    if (min === max) return `${min.toLocaleString("vi-VN")}đ (Theo menu)`;
    return `${min.toLocaleString("vi-VN")}đ - ${max.toLocaleString("vi-VN")}đ (Theo menu)`;
  }, [menu]);

  async function handleLogoUpload(file?: File) {
    if (!file) return;

    setIsUploadingLogo(true);

    try {
      validateImageFile(file);
      const imageUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, logoUrl: imageUrl }));
      notify.success("Đã tải logo quán lên thành công.");
    } catch (error) {
      console.error("Không thể tải logo lên:", error);
      notify.error("Tải logo thất bại.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleUpdateMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.merchantName.trim()) {
      notify.error("Tên nhà hàng không được để trống.");
      return;
    }

    if (form.merchantName.trim().length < 2 || form.merchantName.trim().length > 200) {
      notify.error("Tên nhà hàng phải từ 2 đến 200 ký tự.");
      return;
    }

    if (form.phone.trim() && !/^[0-9+()\-\s]{8,20}$/.test(form.phone.trim())) {
      notify.error("Số điện thoại không hợp lệ (8 - 20 ký tự số).");
      return;
    }

    if (form.address.trim() && form.address.trim().length < 5) {
      notify.error("Địa chỉ nhà hàng phải có ít nhất 5 ký tự.");
      return;
    }

    setSaving(true);
    const toastId = notify.loading("Đang cập nhật thông tin nhà hàng...");

    try {
      const priceRangeToSave =
        form.priceRange.trim() === "Tự động tính theo giá thực đơn"
          ? undefined
          : form.priceRange.trim() || undefined;

      await updateMerchant({
        name: form.merchantName.trim(),
        description: form.merchantDescription.trim() || undefined,
        restaurantType: form.restaurantType.trim() || undefined,
        mainDishType: form.mainDishType.trim() || undefined,
        priceRange: priceRangeToSave,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        openingHours: form.openingHours.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
      });

      const nextMerchant = await getMyMerchantDetail();

      setMerchant(nextMerchant);
      setForm(toEditForm(nextMerchant));
      setIsEditing(false);
      notify.success("Đã cập nhật hồ sơ nhà hàng thành công.", { id: toastId });
    } catch (error) {
      console.error(error);
      notify.error("Cập nhật hồ sơ nhà hàng thất bại.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="merchant-portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]" />
      </div>

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Main Card */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    <Store className="h-3.5 w-3.5" /> Quản lý Nhà hàng
                  </span>
                  {merchant?.status && (
                    <MerchantStatusBadge status={merchant.status} />
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {merchant?.name || "Thông tin nhà hàng"}
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                {merchant && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(toEditForm(merchant));
                      setIsEditing((value) => !value);
                    }}
                    className={`inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-xs font-black shadow-sm transition ${
                      isEditing
                        ? "border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                        : "border border-cyan-500/30 bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-700 hover:border-cyan-400"
                    }`}
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa hồ sơ"}
                  </button>
                )}
                {merchant && (
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/20 px-5 text-xs font-black text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20 shadow-sm transition"
                  >
                    <QrCode className="h-4 w-4" /> In mã QR bàn
                  </button>
                )}
                <Link
                  to="/merchant/foods"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-xs font-black text-slate-950 hover:bg-cyan-400 shadow-md transition"
                >
                  <UtensilsCrossed className="h-4 w-4" /> Quản lý món
                </Link>
              </div>
            </div>

            {loading || isLoadingApplications ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-xs font-bold">Đang tải dữ liệu nhà hàng...</p>
              </div>
            ) : !merchant ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-5">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                  Chưa tìm thấy dữ liệu nhà hàng. Hồ sơ có thể đang chờ Staff duyệt hoặc cấp quyền Merchant.
                </p>
              </div>
            ) : isEditing ? (
              /* Edit Form */
              <form onSubmit={handleUpdateMerchant} className="space-y-6">
                {/* Signboard / Storefront Photo Section */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
                    <ImageWithFallback
                      src={form.logoUrl}
                      alt="Biển hiệu quán"
                      fallbackIcon={<Store className="h-8 w-8 text-cyan-500" />}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Ảnh Biển Hiệu &amp; Mặt Tiền Quán
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                      Ảnh chụp trực diện biển hiệu, bảng tên quán hoặc mặt tiền cửa hàng giúp thực khách và shipper dễ dàng nhận diện khi ghé quán.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <input
                        id="merchant-logo-upload"
                        type="file"
                        accept={IMAGE_UPLOAD_ACCEPT}
                        className="sr-only"
                        disabled={saving || isUploadingLogo}
                        onChange={(e) => {
                          void handleLogoUpload(e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                      />
                      <label
                        htmlFor="merchant-logo-upload"
                        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-slate-950 dark:bg-cyan-500 px-4 text-xs font-black text-white dark:text-slate-950 transition hover:bg-cyan-600 dark:hover:bg-cyan-400 active:scale-95 shadow-sm"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5" />
                        )}
                        {isUploadingLogo ? "Tải lên..." : "Đổi ảnh biển hiệu mới"}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <EditField
                      label="Tên nhà hàng *"
                      value={form.merchantName}
                      onChange={(v) => setForm((p) => ({ ...p, merchantName: v }))}
                      disabled={saving}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <OpeningHoursEditor
                      value={form.openingHours}
                      onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))}
                      disabled={saving}
                    />
                  </div>
                  <EditSelectField
                    label="Loại hình nhà hàng"
                    value={form.restaurantType}
                    onChange={(v) => setForm((p) => ({ ...p, restaurantType: v }))}
                    disabled={saving}
                    options={STANDARD_RESTAURANT_TYPES}
                    helper="Mô hình kinh doanh và không gian phục vụ của quán."
                  />
                  <EditSelectField
                    label="Nhóm món chủ đạo"
                    value={form.mainDishType}
                    onChange={(v) => setForm((p) => ({ ...p, mainDishType: v }))}
                    disabled={saving}
                    options={STANDARD_MAIN_DISH_TYPES}
                    helper="Thể loại món đặc trưng nhất giúp khách dễ tìm thấy quán khi lọc theo món ăn."
                  />
                  <EditSelectField
                    label="Khoảng giá trung bình"
                    value={form.priceRange}
                    onChange={(v) => setForm((p) => ({ ...p, priceRange: v }))}
                    disabled={saving}
                    options={STANDARD_PRICE_RANGES}
                    helper={
                      menuPriceRange
                        ? `Mức giá ước lượng mỗi khách (Đang tự động theo menu: ${menuPriceRange}).`
                        : "Mức giá ước lượng mỗi khách (chọn Tự động để hệ thống tính chuẩn theo menu)."
                    }
                  />
                  <EditField
                    label="Email liên hệ nhà hàng"
                    value={form.email}
                    onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                    disabled={saving}
                  />
                  <EditField
                    label="Số điện thoại nhà hàng"
                    value={form.phone}
                    onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                    disabled={saving}
                  />
                  <div className="md:col-span-2">
                    <RestaurantAddressPicker
                      address={form.address}
                      latitude={form.latitude}
                      longitude={form.longitude}
                      disabled={saving}
                      onChange={({ address, latitude, longitude }) =>
                        setForm((p) => ({ ...p, address, latitude, longitude }))
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Mô tả giới thiệu nhà hàng
                    </label>
                    <textarea
                      value={form.merchantDescription}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          merchantDescription: e.target.value,
                        }))
                      }
                      disabled={saving}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 p-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Mô tả phong cách ẩm thực, câu chuyện quán, cam kết chất lượng và những món best seller..."
                    />
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Mô tả này sẽ hiển thị trực tiếp cho thực khách trên ứng dụng UFind (không chứa thông tin pháp lý hay CCCD).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="h-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-6 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving || isUploadingLogo}
                    className="h-12 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-8 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu thông tin nhà hàng
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Storefront / Signboard & Rating Box (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 h-64 shadow-lg">
                    <ImageWithFallback
                      src={merchant.logoUrl}
                      alt={merchant.name || "Restaurant"}
                      fallbackIcon={<Store className="h-16 w-16 text-cyan-500" />}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => reviewsRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full text-left rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 shadow-lg backdrop-blur-2xl transition hover:border-amber-300/80 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        Đánh giá thực khách <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline">(Xem chi tiết ↓)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {merchant.rating || 0} / 5 ({reviews.length || merchant.reviewCount || 0} đánh giá)
                      </span>
                    </div>
                  </button>
                </div>

                {/* Details Grid (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoLine
                      icon={<MapPin className="h-4 w-4" />}
                      label="Địa chỉ"
                      value={
                        merchant.address ? (
                          <div className="space-y-0.5">
                            <span>{cleanAddress(merchant.address)}</span>
                            {merchant.latitude && merchant.longitude && (
                              <span className="block text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                📍 Tọa độ ghim: {Number(merchant.latitude).toFixed(5)}, {Number(merchant.longitude).toFixed(5)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa cập nhật</span>
                        )
                      }
                    />
                    <InfoLine icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={merchant.phone} />
                    <InfoLine icon={<Mail className="h-4 w-4" />} label="Email nhà hàng" value={merchant.email} />
                    <InfoLine
                      icon={<Clock3 className="h-4 w-4" />}
                      label="Giờ mở cửa"
                      value={
                        merchant.openingHours ? (
                          merchant.openingHours.toLowerCase().includes("nghỉ") ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:text-rose-300">
                              🏖️ {merchant.openingHours}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              {merchant.openingHours}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic font-normal">Chưa thiết lập (Chủ quán cài đặt sau)</span>
                        )
                      }
                    />
                    <InfoLine icon={<Tag className="h-4 w-4" />} label="Loại hình quán" value={merchant.restaurantType} />
                    <InfoLine icon={<Compass className="h-4 w-4" />} label="Nhóm món chủ đạo" value={merchant.mainDishType} />
                    <InfoLine
                      icon={<DollarSign className="h-4 w-4" />}
                      label="Khoảng giá"
                      value={merchant.priceRange || menuPriceRange || "Tự động theo menu"}
                    />
                  </div>

                  {displayDescription ? (
                    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-lg backdrop-blur-2xl">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        Mô tả & Giới thiệu nhà hàng
                      </p>
                      <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.03] p-4 sm:p-5">
                        <p className="whitespace-pre-line text-xs sm:text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                          {displayDescription}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 p-6 shadow-sm backdrop-blur-xl">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        Mô tả & Giới thiệu nhà hàng
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Chưa có bài viết mô tả quán. Nhấn nút "Chỉnh sửa hồ sơ" ở góc trên để bổ sung câu chuyện thương hiệu và phong cách ẩm thực.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Menu Section */}
          {merchant && (
            <section className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">Thực đơn nhà hàng ({menu.length} món)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Danh sách món ăn đang bán hiển thị cho thực khách</p>
                </div>
                <Link
                  to="/merchant/foods"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Quản lý Menu
                </Link>
              </div>

              {menu.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {menu.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10">
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.name}
                          fallbackIcon={<UtensilsCrossed className="h-6 w-6 text-cyan-500" />}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-slate-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs font-black text-cyan-600 dark:text-cyan-400">
                          {(item.price || 0).toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-8 text-center">
                  <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Chưa có món nào trong thực đơn.</p>
                  <Link
                    to="/merchant/foods"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 transition shadow-sm"
                  >
                    + Thêm món ăn mới
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Customer Reviews Section */}
          {merchant && (
            <section
              ref={reviewsRef}
              className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-2xl transition-colors duration-300 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <MessageSquare className="h-3.5 w-3.5" /> Phản hồi khách hàng
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Chi tiết đánh giá ({reviews.length} nhận xét)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Danh sách các phản hồi và số sao thực tế từ khách hàng đã trải nghiệm tại quán
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/50 px-4 py-2 text-xs font-black text-amber-800 dark:text-amber-300 shadow-xs">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{merchant.rating || 0} / 5 điểm trung bình</span>
                </div>
              </div>

              {loadingReviews ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400 space-y-2">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-500" />
                  <p>Đang tải chi tiết các đánh giá...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div
                      key={review.reviewId || idx}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-slate-950/60 p-5 space-y-3 transition hover:border-cyan-500/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 dark:bg-cyan-950 text-xs font-black text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            {getReviewAuthorAvatarUrl(review) ? (
                              <img
                                src={getReviewAuthorAvatarUrl(review) || undefined}
                                alt={getReviewAuthorName(review)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(getReviewAuthorName(review))
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-950 dark:text-white">
                              {getReviewAuthorName(review)}
                            </p>
                            {review.createdAt && (
                              <p className="text-[11px] font-semibold text-slate-400">
                                {new Date(review.createdAt).toLocaleString("vi-VN")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                          {Array.from({ length: review.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      {review.content && (
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                          "{review.content}"
                        </p>
                      )}

                      {review.details && review.details.length > 0 && (
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 space-y-2">
                          <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Đánh giá món ăn cụ thể:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {review.details.map((detail, dIdx) => (
                              <span
                                key={detail.reviewDetailId || dIdx}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                              >
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-bold">{detail.rating}/5</span>
                                {detail.content ? `: ${detail.content}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-8 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Chưa có nhận xét hay bình luận chi tiết nào từ thực khách.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {merchant && (
        <TableQrGeneratorModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          merchantId={merchant.id}
          merchantName={merchant.name || ""}
          merchantAddress={merchant.address}
        />
      )}
    </main>
  );
}

function InfoLine({
  icon,
  label,
  value,
  action,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 p-4 flex flex-col justify-between">
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
            {label}
          </span>
          {action}
        </div>
        <p className="text-xs font-black text-slate-950 dark:text-white truncate">
          {value || <span className="text-slate-400 dark:text-slate-500 font-medium italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  helper?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {hint}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder || label}
        className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
      />
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
          {helper}
        </p>
      )}
    </div>
  );
}

function EditSelectField({
  label,
  value,
  onChange,
  disabled,
  options,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: string[];
  helper?: string;
}) {
  const visibleOptions = value && !options.includes(value)
    ? [value, ...options]
    : options;

  return (
    <div>
      <label className="mb-2 block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
      >
        <option value="">Chọn {label.toLocaleLowerCase("vi-VN")}</option>
        {visibleOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
          {helper}
        </p>
      )}
    </div>
  );
}

function OpeningHoursEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const timeMatch = value.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  const startTime = timeMatch ? timeMatch[1] : "07:00";
  const endTime = timeMatch ? timeMatch[2] : "22:00";

  const isHoliday = value.toLowerCase().includes("nghỉ");

  const handleTimeChange = (newStart: string, newEnd: string) => {
    if (newStart && newEnd) {
      onChange(`${newStart} - ${newEnd}`);
    }
  };

  return (
    <div className="md:col-span-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Clock3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>Cài đặt giờ mở cửa &amp; Lịch hoạt động</span>
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Xóa giờ (Chưa thiết lập)
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400 italic">
            Chưa thiết lập giờ mở cửa
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* Time Pickers */}
        <div className="sm:col-span-6 flex items-center gap-2">
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Giờ mở cửa
            </span>
            <input
              type="time"
              value={startTime}
              disabled={disabled}
              onChange={(e) => handleTimeChange(e.target.value, endTime)}
              className="h-11 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <span className="text-slate-400 font-bold mb-3">-</span>
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Giờ đóng cửa
            </span>
            <input
              type="time"
              value={endTime}
              disabled={disabled}
              onChange={(e) => handleTimeChange(startTime, e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>

        {/* Custom Text / Current Display */}
        <div className="sm:col-span-6">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Hiển thị thực tế (Hoặc tự điền lịch ca gãy / nghỉ lễ)
          </span>
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="VD: 07:00 - 22:00, hoặc Ca gãy: 06:00 - 13:30 & 16:30 - 21:00..."
            className="h-11 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Preset Buttons & Holiday Option */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
          Chọn nhanh:
        </span>
        <button
          type="button"
          onClick={() => onChange("07:00 - 22:00")}
          disabled={disabled}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition"
        >
          07:00 - 22:00
        </button>
        <button
          type="button"
          onClick={() => onChange("06:00 - 21:00")}
          disabled={disabled}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition"
        >
          06:00 - 21:00
        </button>
        <button
          type="button"
          onClick={() => onChange("06:00 - 13:30 & 16:30 - 21:30 (Bán 2 ca)")}
          disabled={disabled}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition"
        >
          Ca trưa &amp; tối (Ca gãy)
        </button>
        <button
          type="button"
          onClick={() => onChange("Cả ngày (24/7)")}
          disabled={disabled}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition"
        >
          Mở 24/7
        </button>
        <button
          type="button"
          onClick={() => onChange("Tạm nghỉ lễ (Sẽ mở lại sau lễ)")}
          disabled={disabled}
          className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
            isHoliday
              ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-xs"
              : "border-amber-300 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
          }`}
        >
          🏖️ Nghỉ lễ / Tạm nghỉ
        </button>
      </div>

      {isHoliday ? (
        <div className="rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <p className="leading-relaxed">
            <strong>Tự động ẩn quán:</strong> Khi chọn <em>Nghỉ lễ / Tạm nghỉ</em>, quán sẽ được tự động ẩn khỏi danh sách tìm kiếm và bản đồ trên UFind để tránh khách tìm đến vào ngày nghỉ. Khi mở bán lại, bạn chỉ cần chọn lại giờ mở cửa thông thường (VD: 07:00 - 22:00) và Lưu lại.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          💡 <strong>Mẹo cho ngày lễ/tết:</strong> Nếu quán nghỉ lễ, bấm nút <em>"🏖️ Nghỉ lễ / Tạm nghỉ"</em> và có thể tự gõ ngày mở bán lại (ví dụ: <em>Nghỉ lễ 30/4, mở lại ngày 02/05</em>) để thực khách nắm rõ thông tin.
        </p>
      )}
    </div>
  );
}
