import { useState } from "react";
import type {
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  ImagePlus,
  Store,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Camera,
} from "lucide-react";
import type { OnboardingFormValues } from "../schema";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";

type Props = Readonly<{
  errors: FieldErrors<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
  watch: UseFormWatch<OnboardingFormValues>;
}>;

export function StorePhotoStep({ errors, setValue, watch }: Props) {
  const logoUrl = watch("logoUrl");
  const logoUploadDataUrl = watch("logoUploadDataUrl");
  const storePhoto2Url = watch("storePhoto2Url");
  const storePhoto2UploadDataUrl = watch("storePhoto2UploadDataUrl");

  const [isUploading1, setIsUploading1] = useState(false);
  const [uploadError1, setUploadError1] = useState("");
  const [isUploading2, setIsUploading2] = useState(false);
  const [uploadError2, setUploadError2] = useState("");

  async function handleUploadMainPhoto(file?: File) {
    if (!file) return;
    setIsUploading1(true);
    setUploadError1("");

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

      const uploadedUrl = await uploadImage(file);
      setValue("logoUrl", uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (err) {
      setValue("logoUploadDataUrl", "", { shouldDirty: true });
      setValue("logoUrl", "", { shouldDirty: true });
      setUploadError1(
        err instanceof Error ? err.message : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsUploading1(false);
    }
  }

  async function handleUploadSecondaryPhoto(file?: File) {
    if (!file) return;
    setIsUploading2(true);
    setUploadError2("");

    try {
      validateImageFile(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setValue("storePhoto2UploadDataUrl", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      const uploadedUrl = await uploadImage(file);
      setValue("storePhoto2Url", uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (err) {
      setValue("storePhoto2UploadDataUrl", "", { shouldDirty: true });
      setValue("storePhoto2Url", "", { shouldDirty: true });
      setUploadError2(
        err instanceof Error ? err.message : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsUploading2(false);
    }
  }

  const preview1 = logoUploadDataUrl || logoUrl;
  const preview2 = storePhoto2UploadDataUrl || storePhoto2Url;

  return (
    <section className="onboarding-card space-y-6">
      <div>
        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
          <Camera className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wider">Bước 2/3</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
          Hình ảnh thực tế của quán
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cung cấp hình ảnh mặt tiền biển hiệu hoặc không gian quán để Staff xác thực quán có thật.
        </p>
      </div>

      {/* Guidance Alert */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/30 p-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-cyan-900 dark:text-cyan-200 mb-0.5">
            Lưu ý quan trọng từ UFind:
          </strong>
          Bạn <strong>không cần chụp khu vực bếp</strong>. Chỉ cần chụp rõ <strong>biển hiệu mặt tiền</strong> (có tên quán trùng khớp) hoặc <strong>không gian đón khách/quầy order</strong>. Sau khi duyệt, ảnh này sẽ được dùng làm ảnh đại diện quán trên ứng dụng.
        </div>
      </div>

      {/* Photo 1: Storefront / Ambience (Required) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Store className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Ảnh mặt tiền / Biển hiệu quán <span className="text-rose-500">*</span></span>
          </label>
          {preview1 && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã chọn ảnh
            </span>
          )}
        </div>

        {preview1 ? (
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-video max-h-64 flex items-center justify-center">
            <img
              src={preview1}
              alt="Mặt tiền quán"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label
                htmlFor="main-store-photo-upload"
                className="cursor-pointer px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-lg flex items-center gap-1.5"
              >
                <Camera className="h-4 w-4" /> Đổi ảnh khác
              </label>
              <button
                type="button"
                onClick={() => {
                  setValue("logoUrl", "", { shouldDirty: true, shouldValidate: true });
                  setValue("logoUploadDataUrl", "", { shouldDirty: true });
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-lg flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Xóa
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="main-store-photo-upload"
            className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900/50 p-8 text-center cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-110 transition-transform">
              <ImagePlus className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              {isUploading1 ? "Đang tải ảnh lên..." : "Nhấn để chọn ảnh hoặc kéo thả vào đây"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ JPG, PNG, WebP (Tối đa 10MB)
            </p>
          </label>
        )}

        <input
          id="main-store-photo-upload"
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          className="hidden"
          disabled={isUploading1}
          onChange={(e) => void handleUploadMainPhoto(e.target.files?.[0])}
        />

        {uploadError1 && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {uploadError1}
          </p>
        )}
        {errors.logoUrl && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {errors.logoUrl.message}
          </p>
        )}
      </div>

      {/* Photo 2: Ambience / Seating (Optional) */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Ảnh không gian quán / Bàn ghế đón khách <span className="text-xs text-slate-400 font-normal">(Tùy chọn)</span></span>
          </label>
          {preview2 && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã chọn ảnh
            </span>
          )}
        </div>

        {preview2 ? (
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-video max-h-56 flex items-center justify-center">
            <img
              src={preview2}
              alt="Không gian quán"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label
                htmlFor="second-store-photo-upload"
                className="cursor-pointer px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-lg flex items-center gap-1.5"
              >
                <Camera className="h-4 w-4" /> Đổi ảnh
              </label>
              <button
                type="button"
                onClick={() => {
                  setValue("storePhoto2Url", "", { shouldDirty: true });
                  setValue("storePhoto2UploadDataUrl", "", { shouldDirty: true });
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-lg flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Xóa
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="second-store-photo-upload"
            className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 p-6 text-center cursor-pointer hover:border-cyan-500/50 transition-all"
          >
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isUploading2 ? "Đang tải ảnh lên..." : "+ Thêm ảnh không gian quán nếu có"}
            </p>
          </label>
        )}

        <input
          id="second-store-photo-upload"
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          className="hidden"
          disabled={isUploading2}
          onChange={(e) => void handleUploadSecondaryPhoto(e.target.files?.[0])}
        />

        {uploadError2 && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {uploadError2}
          </p>
        )}
      </div>
    </section>
  );
}
