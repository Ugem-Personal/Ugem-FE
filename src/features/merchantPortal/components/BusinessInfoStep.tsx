import { useState } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Info, Mail, Store, Tags, Utensils, Wallet, Clock, ImagePlus } from "lucide-react";
import type { OnboardingFormValues } from "../schema";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";

type Props = Readonly<{
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  watch: UseFormWatch<OnboardingFormValues>;
}>;

const priceRanges = ["Tiết kiệm", "Bình dân", "Tầm trung"];

const openingHourPresets = [
  { label: "Sáng - tối", value: "08:00 - 22:00" },
  { label: "Cả ngày", value: "00:00 - 23:59" },
  { label: "Tối", value: "16:00 - 23:00" },
];

function getOpeningHourParts(value?: string) {
  const [start = "08:00", end = "22:00"] = (value || "08:00 - 22:00")
    .split("-")
    .map((item) => item.trim());

  return { start, end };
}

export function BusinessInfoStep({ register, errors, setValue, watch }: Props) {
  const priceRange = watch("priceRange");
  const logoUploadDataUrl = watch("logoUploadDataUrl");
  const openingHours = watch("openingHours") || "08:00 - 22:00";
  const { start: openingStart, end: openingEnd } =
    getOpeningHourParts(openingHours);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoFileName, setLogoFileName] = useState("");

  async function handleLogoUpload(file?: File) {
    if (!file) return;

    setLogoFileName(file.name);
    setIsUploadingLogo(true);
    setLogoUploadError("");

    try {
      validateImageFile(file);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setValue("logoUploadDataUrl", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      const imageUrl = await uploadImage(file);

      setValue("logoUrl", imageUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      console.error("Không thể tải ảnh lên:", error);
      setValue("logoUrl", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("logoUploadDataUrl", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setLogoFileName("Chưa chọn ảnh");
      setLogoUploadError(
        error instanceof Error
          ? error.message
          : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/85 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative">
        <div className="mb-8 flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-800 shadow-sm">
            <Store className="h-7 w-7" />
          </div>

          <div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-800">
              Merchant onboarding
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Thông tin cơ bản
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Giúp UGem hiểu rõ hơn về quán của bạn để xét duyệt và hiển thị
              chính xác.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Tên quán của bạn *
              </span>
              <div className="relative">
                <Store className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  placeholder="Ví dụ: Bún Chả Bà Hải - Hẻm 12"
                  {...register("restaurantName")}
                />
              </div>
              {errors.restaurantName && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.restaurantName.message}
                </small>
              )}
            </label>

            <div className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Giờ mở cửa *
              </span>
              <input type="hidden" {...register("openingHours")} />
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={openingStart}
                    onChange={(event) =>
                      setValue(
                        "openingHours",
                        `${event.target.value} - ${openingEnd}`,
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                    aria-label="Giờ mở cửa"
                  />
                </div>
                <span className="text-sm font-bold text-slate-400">-</span>
                <input
                  type="time"
                  value={openingEnd}
                  onChange={(event) =>
                    setValue(
                      "openingHours",
                      `${openingStart} - ${event.target.value}`,
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  aria-label="Giờ đóng cửa"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {openingHourPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setValue("openingHours", preset.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      openingHours === preset.value
                        ? "border-cyan-600 bg-cyan-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {errors.openingHours && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.openingHours.message}
                </small>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Email liên hệ *
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  placeholder="merchant@gmail.com"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.email.message}
                </small>
              )}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Số điện thoại *
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  placeholder="0123456789"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.phone.message}
                </small>
              )}
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-800">Logo quán *</span>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="relative flex items-center gap-3">
                  <input
                    id="logo-image-upload"
                    className="hidden"
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    onChange={(event) =>
                      handleLogoUpload(event.target.files?.[0])
                    }
                  />
                  <label
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-cyan-500/15"
                    htmlFor="logo-image-upload"
                  >
                    <ImagePlus className="h-5 w-5 text-slate-400" />
                    Chọn ảnh logo
                  </label>
                  <span className="text-sm text-slate-500">
                    {isUploadingLogo
                      ? "Đang tải ảnh..."
                      : logoFileName || "Chưa chọn ảnh"}
                  </span>
                </div>
                {logoUploadError && (
                  <small className="mt-1 block text-sm font-medium text-rose-600">
                    {logoUploadError}
                  </small>
                )}
                {errors.logoUrl && (
                  <small className="mt-1 block text-sm font-medium text-rose-600">
                    {errors.logoUrl.message}
                  </small>
                )}
              </div>
              
              {(() => {
                const src = logoUploadDataUrl || watch("logoUrl");
                if (!src || (!src.startsWith("data:image/") && !src.startsWith("http"))) return null;

                return (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <img
                      src={src}
                      alt="Logo quán"
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Loại hình quán *
              </span>
              <div className="relative">
                <Tags className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  {...register("restaurantType")}
                >
                  <option value="">Chọn loại hình</option>
                  <option value="Quán ăn gia đình">Quán ăn gia đình</option>
                  <option value="Quán vỉa hè">Quán vỉa hè</option>
                  <option value="Nhà hàng nhỏ">Nhà hàng nhỏ</option>
                  <option value="Xe đẩy / gánh hàng">Xe đẩy / gánh hàng</option>
                </select>
              </div>
              {errors.restaurantType && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.restaurantType.message}
                </small>
              )}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Loại món chính *
              </span>
              <div className="relative">
                <Utensils className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  {...register("mainDishType")}
                >
                  <option value="">Chọn món chính</option>
                  <option value="Phở / Bún / Mì">Phở / Bún / Mì</option>
                  <option value="Cơm">Cơm</option>
                  <option value="Bánh mì">Bánh mì</option>
                  <option value="Ăn vặt">Ăn vặt</option>
                  <option value="Đặc sản vùng miền">Đặc sản vùng miền</option>
                </select>
              </div>
              {errors.mainDishType && (
                <small className="block text-sm font-medium text-rose-600">
                  {errors.mainDishType.message}
                </small>
              )}
            </label>
          </div>

          <div className="space-y-3">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Wallet className="h-4 w-4 text-cyan-700" />
              Khoảng giá trung bình *
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {priceRanges.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`
                    h-12 rounded-2xl border text-sm font-bold shadow-sm transition
                    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/20
                    ${
                      priceRange === item
                        ? "border-cyan-600 bg-cyan-700 text-white shadow-cyan-900/20"
                        : "border-slate-200 bg-white/90 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                    }
                  `}
                  onClick={() =>
                    setValue("priceRange", item, { shouldValidate: true })
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            {errors.priceRange && (
              <small className="block text-sm font-medium text-rose-600">
                {errors.priceRange.message}
              </small>
            )}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">
              Mô tả ngắn về quán
            </span>
            <textarea
              className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
              placeholder="Chia sẻ một chút về câu chuyện hoặc điểm đặc biệt của quán..."
              {...register("description")}
            />
            {errors.description && (
              <small className="block text-sm font-medium text-rose-600">
                {errors.description.message}
              </small>
            )}
          </label>

          <div className="rounded-3xl border border-cyan-100 bg-cyan-50/80 p-5 text-cyan-950">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <strong className="text-sm font-black">Mẹo cho chủ quán</strong>
                <p className="mt-1 text-sm leading-6 text-cyan-900/80">
                  Hãy mô tả quán thật chân thực. UGem yêu thích những câu chuyện
                  đằng sau các món ăn “underrated”.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
