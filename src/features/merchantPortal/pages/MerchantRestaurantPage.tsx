import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import { getMapMerchants, getMerchantDetail } from "@/features/customer/services/merchantService";
import type { MerchantDetail } from "@/features/customer/types";
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
};

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

function getDisplayDescription(description?: string) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const markerIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("thông tin ui bổ sung"),
  );
  const summaryLines =
    markerIndex >= 0
      ? lines.slice(0, markerIndex)
      : lines.filter(
          (line) =>
            !DESCRIPTION_META_LABELS.some((label) =>
              line.toLowerCase().startsWith(`${label.toLowerCase()}:`),
            ),
        );

  return summaryLines.join("\n").trim();
}

function toEditForm(merchant?: MerchantDetail | null): MerchantEditForm {
  return {
    merchantName: merchant?.name ?? "",
    merchantDescription: getDisplayDescription(merchant?.description),
    restaurantType: merchant?.restaurantType ?? "",
    mainDishType: merchant?.mainDishType ?? "",
    priceRange: merchant?.priceRange ?? "",
    email: merchant?.email ?? "",
    phone: merchant?.phone ?? "",
    address: merchant?.address ?? "",
    openingHours: merchant?.openingHours ?? "",
    logoUrl: merchant?.logoUrl ?? "",
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

  const matchedMerchant = merchants.find((m) => {
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
      await updateMerchant({
        name: form.merchantName.trim(),
        description: form.merchantDescription.trim() || undefined,
        restaurantType: form.restaurantType.trim() || undefined,
        mainDishType: form.mainDishType.trim() || undefined,
        priceRange: form.priceRange.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        openingHours: form.openingHours.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
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
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm transition"
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa hồ sơ"}
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
                {/* Logo Upload Section */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
                    <ImageWithFallback
                      src={form.logoUrl}
                      alt="Logo preview"
                      fallbackIcon={<Store className="h-8 w-8 text-cyan-500" />}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Logo Đại Diện Nhà Hàng
                    </label>
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
                        {isUploadingLogo ? "Tải lên..." : "Chọn ảnh Logo mới"}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField
                    label="Tên nhà hàng *"
                    value={form.merchantName}
                    onChange={(v) => setForm((p) => ({ ...p, merchantName: v }))}
                    disabled={saving}
                  />
                  <EditField
                    label="Giờ mở cửa"
                    value={form.openingHours}
                    onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))}
                    disabled={saving}
                    placeholder="VD: 08:00 - 22:00"
                  />
                  <EditField
                    label="Loại hình nhà hàng"
                    value={form.restaurantType}
                    onChange={(v) => setForm((p) => ({ ...p, restaurantType: v }))}
                    disabled={saving}
                    placeholder="VD: Quán ăn gia đình, Fast food..."
                  />
                  <EditField
                    label="Loại món ăn chính"
                    value={form.mainDishType}
                    onChange={(v) => setForm((p) => ({ ...p, mainDishType: v }))}
                    disabled={saving}
                    placeholder="VD: Cơm tấm, Bún bò, Trà sữa..."
                  />
                  <EditField
                    label="Khoảng giá trung bình"
                    value={form.priceRange}
                    onChange={(v) => setForm((p) => ({ ...p, priceRange: v }))}
                    disabled={saving}
                    placeholder="VD: 30.000đ - 100.000đ"
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
                  <EditField
                    label="Địa chỉ nhà hàng"
                    value={form.address}
                    onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                    disabled={saving}
                  />

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
                      placeholder="Mô tả phong cách ẩm thực, cam kết vệ sinh và điểm nổi bật của nhà hàng..."
                    />
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
                {/* Logo & Rating Box (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 h-64 shadow-lg">
                    <ImageWithFallback
                      src={merchant.logoUrl}
                      alt={merchant.name || "Restaurant"}
                      fallbackIcon={<Store className="h-16 w-16 text-cyan-500" />}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 shadow-lg backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Đánh giá thực khách
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {merchant.rating || 0} / 5 ({merchant.reviewCount || 0} đánh giá)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoLine icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={cleanAddress(merchant.address)} />
                    <InfoLine icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={merchant.phone} />
                    <InfoLine icon={<Mail className="h-4 w-4" />} label="Email nhà hàng" value={merchant.email} />
                    <InfoLine icon={<Clock3 className="h-4 w-4" />} label="Giờ mở cửa" value={merchant.openingHours} />
                    <InfoLine icon={<Tag className="h-4 w-4" />} label="Loại hình quán" value={merchant.restaurantType} />
                    <InfoLine icon={<Compass className="h-4 w-4" />} label="Món chính" value={merchant.mainDishType} />
                    <InfoLine icon={<DollarSign className="h-4 w-4" />} label="Khoảng giá" value={merchant.priceRange} />
                  </div>

                  {displayDescription && (
                    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-lg backdrop-blur-2xl">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Mô tả nhà hàng
                      </p>
                      <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                        {displayDescription}
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
        </div>
      </section>
    </main>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
        {label}
      </div>
      <p className="text-xs font-black text-slate-950 dark:text-white truncate">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
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
        disabled={disabled}
        placeholder={placeholder || label}
        className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-400"
      />
    </div>
  );
}
