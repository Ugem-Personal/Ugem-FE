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
} from "lucide-react";

import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";
import { getMapMerchants, getMerchantDetail } from "@/features/customer/services/merchantService";
import type { MerchantDetail } from "@/features/customer/types";
import {
  getCurrentMerchantId,
  getMyMerchantDetail,
  updateMerchant,
} from "../services";
import { useMyApplications } from "../hooks/useMyApplications";
import type { MerchantApplication } from "../types";

type MerchantEditForm = {
  merchantName: string;
  merchantDescription: string;
  email: string;
  phone: string;
  address: string;
  openingHours: string;
};

function toEditForm(merchant?: MerchantDetail | null): MerchantEditForm {
  return {
    merchantName: merchant?.name ?? "",
    merchantDescription: merchant?.description ?? "",
    email: merchant?.email ?? "",
    phone: merchant?.phone ?? "",
    address: merchant?.address ?? "",
    openingHours: merchant?.openingHours ?? "",
  };
}

const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

const DESCRIPTION_CHIP_LABELS = DESCRIPTION_META_LABELS.slice(1);

function cleanDescriptionText(description?: string | null) {
  return (description ?? "")
    .replace(/\s*---\s*Thông tin UI bổ sung\s*---\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFirstLabelIndex(value: string, labels: string[]) {
  const normalizedValue = value.toLocaleLowerCase("vi-VN");
  const indexes = labels
    .map((label) => normalizedValue.indexOf(label.toLocaleLowerCase("vi-VN")))
    .filter((index) => index >= 0);

  return indexes.length ? Math.min(...indexes) : -1;
}

function getDisplayDescription(description?: string | null) {
  const cleaned = cleanDescriptionText(description);
  if (!cleaned) return "";

  const firstMetaIndex = findFirstLabelIndex(cleaned, DESCRIPTION_META_LABELS);
  const displayText =
    firstMetaIndex >= 0 ? cleaned.slice(0, firstMetaIndex) : cleaned;

  return displayText.replace(/\s*---\s*$/, "").trim();
}

function readDescriptionMeta(description: string, label: string) {
  const cleaned = cleanDescriptionText(description);
  const labelIndex = findFirstLabelIndex(cleaned, [label]);

  if (labelIndex < 0) return "";

  const valueStart = labelIndex + label.length;
  const valueText = cleaned.slice(valueStart).replace(/^:?\s*/, "");
  const nextLabelIndex = findFirstLabelIndex(
    valueText,
    DESCRIPTION_CHIP_LABELS.filter((item) => item !== label),
  );

  return (nextLabelIndex >= 0 ? valueText.slice(0, nextLabelIndex) : valueText)
    .replace(/\s*---\s*$/, "")
    .trim();
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
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
    categoryDetail: item.category ? [item.category] : undefined,
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

  const normalizedName = normalizeText(application.name);
  const normalizedAddress = normalizeText(application.address);

  const matchedMerchant = merchants.find((merchant) => {
    const merchantName = normalizeText(merchant.name);
    const merchantAddress = normalizeText(merchant.address);

    if (!normalizedName) return false;

    return (
      merchantName === normalizedName ||
      merchantName.includes(normalizedName) ||
      (normalizedAddress && merchantAddress === normalizedAddress)
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
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<MerchantEditForm>(() => toEditForm(null));
  const merchantId = getCurrentMerchantId();
  const { data: applications = [], isLoading: isLoadingApplications } =
    useMyApplications();

  const latestApprovedApplication = useMemo(
    () =>
      [...applications].find((application) =>
        isApprovedStatus(application.status),
      ) ??
      null,
    [applications],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        let data: MerchantDetail | null = null;

        if (merchantId) {
          data = await getMyMerchantDetail();
        } else if (latestApprovedApplication) {
          data = await resolveMerchantFromApprovedApplication(
            latestApprovedApplication,
          );
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

    queueMicrotask(() => {
      void load();
    });

    return () => {
      active = false;
    };
  }, [latestApprovedApplication, merchantId]);

  const menu = merchant?.menu ?? merchant?.foods ?? [];
  const displayDescription = getDisplayDescription(merchant?.description);
  const descriptionMeta = merchant?.description
    ? [
        {
          label: "Loại hình",
          value: readDescriptionMeta(merchant.description, "Loại hình quán"),
        },
        {
          label: "Món chính",
          value: readDescriptionMeta(merchant.description, "Loại món chính"),
        },
        {
          label: "Khoảng giá",
          value: readDescriptionMeta(
            merchant.description,
            "Khoảng giá trung bình",
          ),
        },
      ].filter((item) => item.value)
    : [];

  async function handleUpdateMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await updateMerchant({
        name: form.merchantName.trim(),
        description: form.merchantDescription.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        openingHours: form.openingHours.trim(),
      });

      const nextMerchant = merchantId
        ? await getMyMerchantDetail()
        : latestApprovedApplication
          ? await resolveMerchantFromApprovedApplication(
              latestApprovedApplication,
            )
          : merchant;

      setMerchant(nextMerchant);
      setForm(toEditForm(nextMerchant));
      setIsEditing(false);
      notify.success("Đã cập nhật hồ sơ nhà hàng.");
    } catch (error) {
      console.error(error);
      notify.error("Cập nhật hồ sơ nhà hàng thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <section className="relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 hover:opacity-100 mix-blend-multiply" />
            
            <div className="mb-8 flex flex-wrap items-start justify-between gap-6 relative">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                  Nhà hàng của bạn
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
                  {merchant?.name || "Thông tin nhà hàng"}
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                {merchant ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(toEditForm(merchant));
                      setIsEditing((value) => !value);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-slate-200/60 px-5 py-2.5 text-[13px] font-black text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                  >
                    {isEditing ? <X size={16} /> : <Pencil size={16} />}
                    {isEditing ? "Hủy sửa" : "Chỉnh sửa"}
                  </button>
                ) : null}
                <Link
                  to="/merchant/foods"
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-2.5 text-[13px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                >
                  Quản lý món
                </Link>
                <Link
                  to="/merchant/orders"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-cyan-200/60 px-5 py-2.5 text-[13px] font-black text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md"
                >
                  Đơn hàng
                </Link>
              </div>
            </div>

            {loading || isLoadingApplications ? (
              <p className="text-[14px] font-medium text-slate-500">Đang tải nhà hàng...</p>
            ) : !merchant ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-linear-to-br from-amber-50/90 to-orange-50/90 p-5 shadow-sm">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-300/30 blur-2xl" />
                <p className="relative text-[14px] font-bold text-amber-800 leading-relaxed">
                  Chưa đồng bộ được hồ sơ nhà hàng. Trang sẽ tự lấy dữ liệu từ
                  hồ sơ đã duyệt và merchant public ngay khi staff phê duyệt.
                  {merchantId
                    ? " Token hiện tại đã có MerchantId nhưng BE chưa trả dữ liệu."
                    : " Hồ sơ có thể đang chờ đồng bộ sau khi được duyệt."}
                </p>
              </div>
            ) : isEditing ? (
              <form
                onSubmit={handleUpdateMerchant}
                className="grid gap-5 md:grid-cols-2 relative"
              >
                <EditField
                  label="Tên nhà hàng"
                  value={form.merchantName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, merchantName: value }))
                  }
                  disabled={saving}
                />
                <EditField
                  label="Giờ mở cửa"
                  value={form.openingHours}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, openingHours: value }))
                  }
                  disabled={saving}
                />
                <EditField
                  label="Email"
                  value={form.email}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, email: value }))
                  }
                  disabled={saving}
                />
                <EditField
                  label="Số điện thoại"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, phone: value }))
                  }
                  disabled={saving}
                />
                <EditField
                  label="Địa chỉ"
                  value={form.address}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, address: value }))
                  }
                  disabled={saving}
                  className="md:col-span-2"
                />
                <label className="block md:col-span-2 space-y-1.5">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                    Mô tả
                  </span>
                  <textarea
                    value={form.merchantDescription}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        merchantDescription: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="w-full min-h-32 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 disabled:opacity-60"
                  />
                </label>
                <div className="flex justify-end md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60"
                  >
                    <Save size={18} />
                    {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[260px_1fr] relative">
                <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/50 shadow-md">
                  {merchant.logoUrl ? (
                    <img
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-64 place-items-center text-cyan-700 bg-linear-to-br from-cyan-50 to-blue-50">
                      <Store size={56} className="opacity-50" />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoLine
                      icon={<MapPin size={16} />}
                      label="Địa chỉ"
                      value={cleanAddress(merchant.address)}
                    />
                    <InfoLine
                      icon={<Phone size={16} />}
                      label="Liên hệ"
                      value={merchant.phone || merchant.email}
                    />
                    <InfoLine
                      icon={<Clock3 size={16} />}
                      label="Giờ mở cửa"
                      value={merchant.openingHours}
                    />
                    <InfoLine
                      icon={<Star size={16} />}
                      label="Đánh giá"
                      value={
                        typeof merchant.rating === "number"
                          ? `${merchant.rating}/5`
                          : undefined
                      }
                    />
                  </div>

                  {displayDescription ? (
                    <div className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Mô tả
                      </p>
                      <p className="mt-3 text-[14px] font-medium leading-relaxed text-slate-700">
                        {displayDescription}
                      </p>
                      {descriptionMeta.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2.5">
                          {descriptionMeta.map((item) => (
                            <span
                              key={item.label}
                              className="rounded-full border border-cyan-200/60 bg-white/70 px-4 py-1.5 text-[12px] font-black tracking-wide text-cyan-800 shadow-sm"
                            >
                              {item.label}: {item.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          {merchant ? (
            <section className="mt-8 relative overflow-hidden rounded-4xl border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
              <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl opacity-0 transition-opacity duration-500 hover:opacity-100 mix-blend-multiply" />
              <h2 className="mb-6 text-[18px] font-black tracking-tight text-slate-900 relative">
                Menu hiện tại
              </h2>

              {menu.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 relative">
                  {menu.map((item) => (
                    <article
                      key={item.id}
                      className="group flex items-center gap-4 rounded-[20px] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md hover:border-white/80"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-20 w-20 shrink-0 rounded-2xl bg-linear-to-br from-cyan-50 to-blue-50 shadow-sm" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[16px] font-black text-slate-900 group-hover:text-cyan-800 transition-colors">
                          {item.name}
                        </h3>
                        <p className="mt-1.5 text-[15px] font-black text-cyan-700">
                          {item.price.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-12 text-center shadow-sm backdrop-blur">
                  <p className="text-[15px] font-bold text-slate-500">
                    Chưa có món nào trong menu.
                  </p>
                </div>
              )}
            </section>
          ) : null}
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
    <div className="rounded-[20px] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/80 hover:shadow-md">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span className="text-cyan-700">{icon}</span>
        {label}
      </div>
      <p className="text-[14px] font-black text-slate-900">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-white/60 bg-white/70 px-4 text-[14px] font-medium text-slate-900 outline-none shadow-sm backdrop-blur transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 disabled:opacity-60"
      />
    </label>
  );
}
