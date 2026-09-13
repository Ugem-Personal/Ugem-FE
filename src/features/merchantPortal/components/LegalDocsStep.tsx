import { useState } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { useFormContext } from "react-hook-form";
import {
  FileCheck,
  ShieldCheck,
  IdCard,
  Building2,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Camera,
  Lock,
  FileText,
  Maximize2,
  X,
} from "lucide-react";
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

export function LegalDocsStep({ register, errors, setValue, watch }: Props) {
  const { clearErrors } = useFormContext<OnboardingFormValues>();

  const idCardFrontUrl = watch("idCardFrontUrl");
  const idCardFrontUploadDataUrl = watch("idCardFrontUploadDataUrl");
  const idCardBackUrl = watch("idCardBackUrl");
  const idCardBackUploadDataUrl = watch("idCardBackUploadDataUrl");
  const businessLicenseUrl = watch("businessLicenseUrl");
  const businessLicenseUploadDataUrl = watch("businessLicenseUploadDataUrl");

  // Watched fields for review summary
  const restaurantName = watch("restaurantName");
  const restaurantType = watch("restaurantType");
  const phone = watch("phone");
  const address = watch("address");
  const representativeName = watch("representativeName");
  const idCardNumber = watch("idCardNumber");
  const logoUrl = watch("logoUrl");

  // Upload loading & error states
  const [uploadingFront, setUploadingFront] = useState(false);
  const [errorFront, setErrorFront] = useState("");

  const [uploadingBack, setUploadingBack] = useState(false);
  const [errorBack, setErrorBack] = useState("");

  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [errorLicense, setErrorLicense] = useState("");

  // Lightbox Zoom Modal
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  async function handleUploadDoc(
    file: File | undefined,
    urlFieldName: "idCardFrontUrl" | "idCardBackUrl" | "businessLicenseUrl",
    previewFieldName:
      | "idCardFrontUploadDataUrl"
      | "idCardBackUploadDataUrl"
      | "businessLicenseUploadDataUrl",
    setLoading: (val: boolean) => void,
    setError: (err: string) => void,
  ) {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      validateImageFile(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setValue(previewFieldName, dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(urlFieldName);

      const uploadedUrl = await uploadImage(file);
      setValue(urlFieldName, uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors(urlFieldName);
    } catch (err) {
      setValue(previewFieldName, "", { shouldDirty: true });
      setValue(urlFieldName, "", { shouldDirty: true });
      setError(
        err instanceof Error ? err.message : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  const frontPreview = idCardFrontUploadDataUrl || idCardFrontUrl;
  const backPreview = idCardBackUploadDataUrl || idCardBackUrl;
  const licensePreview =
    businessLicenseUploadDataUrl || businessLicenseUrl;

  return (
    <section className="onboarding-card space-y-6">
      <div>
        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wider">Bước 3/3</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
          Hồ sơ pháp lý &amp; Định danh chủ quán
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Để đảm bảo tính xác thực và quyền lợi khi hợp tác, vui lòng cung cấp giấy tờ tùy thân và giấy phép kinh doanh của quán.
        </p>
      </div>

      {/* Security note */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-emerald-900 dark:text-emerald-200 mb-0.5">
            Bảo mật thông tin tuyệt đối:
          </strong>
          Tài liệu pháp lý của bạn được mã hóa an toàn và chỉ phục vụ duy nhất mục đích kiểm duyệt danh tính Merchant theo quy định pháp luật.
        </div>
      </div>

      {/* Representative info */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <IdCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>Thông tin chủ hộ kinh doanh / Người đại diện pháp luật</span>
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Họ và tên người đại diện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              {...register("representativeName")}
            />
            {errors.representativeName && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.representativeName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Số CCCD / CMND / Hộ chiếu <span className="text-xs text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="001234567890"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              {...register("idCardNumber")}
            />
          </div>
        </div>
      </div>

      {/* Document 1: CCCD / ID Card (Front & Back) */}
      <div className="space-y-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <IdCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Ảnh Căn cước công dân (CCCD) <span className="text-rose-500">* (Bắt buộc cả 2 mặt)</span></span>
          </div>
          {frontPreview && backPreview && (
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã đủ 2 mặt
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Mặt trước */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Mặt trước CCCD *</span>
              {frontPreview && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Đã tải lên
                </span>
              )}
            </span>

            {frontPreview ? (
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-950/5 dark:bg-slate-900/60 p-2 min-h-[220px] max-h-[320px] flex items-center justify-center">
                <img
                  src={frontPreview}
                  alt="Mặt trước CCCD"
                  className="max-h-[300px] w-auto max-w-full object-contain rounded-xl shadow-sm cursor-pointer"
                  onClick={() => setZoomImage(frontPreview)}
                />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomImage(frontPreview)}
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold hover:bg-white shadow flex items-center gap-1 transition-colors"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Xem lớn
                  </button>
                  <label
                    htmlFor="id-card-front-upload"
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow flex items-center gap-1 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" /> Đổi ảnh
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("idCardFrontUrl", "", { shouldDirty: true, shouldValidate: true });
                      setValue("idCardFrontUploadDataUrl", "", { shouldDirty: true });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="id-card-front-upload"
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900/50 p-6 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/30 transition-all min-h-[220px]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-105 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {uploadingFront ? "Đang tải ảnh..." : "Tải ảnh mặt trước"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Rõ nét, đủ 4 góc thẻ</p>
              </label>
            )}

            <input
              id="id-card-front-upload"
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              className="hidden"
              disabled={uploadingFront}
              onChange={(e) =>
                void handleUploadDoc(
                  e.target.files?.[0],
                  "idCardFrontUrl",
                  "idCardFrontUploadDataUrl",
                  setUploadingFront,
                  setErrorFront,
                )
              }
            />

            {errorFront && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errorFront}
              </p>
            )}
            {errors.idCardFrontUrl && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.idCardFrontUrl.message}
              </p>
            )}
          </div>

          {/* Mặt sau */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Mặt sau CCCD *</span>
              {backPreview && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Đã tải lên
                </span>
              )}
            </span>

            {backPreview ? (
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-950/5 dark:bg-slate-900/60 p-2 min-h-[220px] max-h-[320px] flex items-center justify-center">
                <img
                  src={backPreview}
                  alt="Mặt sau CCCD"
                  className="max-h-[300px] w-auto max-w-full object-contain rounded-xl shadow-sm cursor-pointer"
                  onClick={() => setZoomImage(backPreview)}
                />
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomImage(backPreview)}
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold hover:bg-white shadow flex items-center gap-1 transition-colors"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Xem lớn
                  </button>
                  <label
                    htmlFor="id-card-back-upload"
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow flex items-center gap-1 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" /> Đổi ảnh
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("idCardBackUrl", "", { shouldDirty: true, shouldValidate: true });
                      setValue("idCardBackUploadDataUrl", "", { shouldDirty: true });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="id-card-back-upload"
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900/50 p-6 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/30 transition-all min-h-[220px]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-105 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {uploadingBack ? "Đang tải ảnh..." : "Tải ảnh mặt sau"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Rõ vân tay, ngày cấp</p>
              </label>
            )}

            <input
              id="id-card-back-upload"
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              className="hidden"
              disabled={uploadingBack}
              onChange={(e) =>
                void handleUploadDoc(
                  e.target.files?.[0],
                  "idCardBackUrl",
                  "idCardBackUploadDataUrl",
                  setUploadingBack,
                  setErrorBack,
                )
              }
            />

            {errorBack && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errorBack}
              </p>
            )}
            {errors.idCardBackUrl && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.idCardBackUrl.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Document 2: Business Registration License */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Giấy phép kinh doanh (GPKD) <span className="text-rose-500">* (Hộ KD hoặc Doanh nghiệp)</span></span>
          </div>
          {licensePreview && (
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã tải lên
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 items-start">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Số Giấy phép KD / Mã số thuế <span className="text-xs text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: 01A8012345 hoặc 0312345678"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              {...register("businessLicenseNumber")}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed sm:pt-6">
            Tải lên bản chụp rõ nét <strong>Giấy chứng nhận đăng ký hộ kinh doanh</strong> (cấp bởi UBND Quận/Huyện) hoặc <strong>Giấy chứng nhận đăng ký doanh nghiệp</strong> (cấp bởi Sở KH&amp;ĐT).
          </p>
        </div>

        {/* Khung tải và xem ảnh GPKD lớn, rõ ràng */}
        <div className="space-y-2">
          {licensePreview ? (
            <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-950/5 dark:bg-slate-900/60 p-4 min-h-[360px] max-h-[580px] flex items-center justify-center">
              <img
                src={licensePreview}
                alt="Giấy phép kinh doanh"
                className="max-h-[540px] w-auto max-w-full object-contain rounded-xl shadow-md cursor-pointer"
                onClick={() => setZoomImage(licensePreview)}
              />
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoomImage(licensePreview)}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-bold hover:bg-white shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  <Maximize2 className="h-4 w-4" /> Phóng to xem ảnh gốc
                </button>
                <label
                  htmlFor="business-license-upload"
                  className="cursor-pointer px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="h-4 w-4" /> Đổi ảnh khác
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setValue("businessLicenseUrl", "", { shouldDirty: true, shouldValidate: true });
                    setValue("businessLicenseUploadDataUrl", "", { shouldDirty: true });
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Xóa
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="business-license-upload"
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900/50 p-10 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/30 transition-all min-h-[240px]"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-110 transition-transform">
                <FileCheck className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                {uploadingLicense ? "Đang tải ảnh Giấy phép KD lên hệ thống..." : "Nhấn để chọn ảnh hoặc kéo thả Giấy phép kinh doanh vào đây"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Hỗ trợ JPG, PNG, WebP (Rõ nét, đủ 4 góc văn bản, dung lượng tối đa 10MB)
              </p>
            </label>
          )}

          <input
            id="business-license-upload"
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            className="hidden"
            disabled={uploadingLicense}
            onChange={(e) =>
              void handleUploadDoc(
                e.target.files?.[0],
                "businessLicenseUrl",
                "businessLicenseUploadDataUrl",
                setUploadingLicense,
                setErrorLicense,
              )
            }
          />

          {errorLicense && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errorLicense}
            </p>
          )}
          {errors.businessLicenseUrl && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.businessLicenseUrl.message}
            </p>
          )}
        </div>
      </div>

      {/* Tóm tắt hồ sơ trước khi gửi & Cam kết pháp lý */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            Tóm tắt hồ sơ &amp; Cam kết pháp lý
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Tên quán ăn / Nhà hàng:</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                {restaurantName || "Chưa nhập tên quán"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Loại hình ẩm thực:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {restaurantType || "Quán ăn / Đồ uống"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Hotline liên hệ:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{phone || "Chưa nhập"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Người đại diện / Chủ hộ:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {representativeName || "Chưa nhập"}
                {idCardNumber ? ` (CCCD: ${idCardNumber})` : ""}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block font-medium">Địa chỉ hoạt động:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {address || "Chưa chọn địa chỉ trên bản đồ"}
              </span>
            </div>
          </div>

          {/* Checklist giấy tờ */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
              logoUrl ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Biển hiệu: {logoUrl ? "Đã có" : "Chưa có"}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
              idCardFrontUrl && idCardBackUrl ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" /> CCCD 2 mặt: {idCardFrontUrl && idCardBackUrl ? "Đủ 2 mặt" : "Thiếu ảnh"}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
              businessLicenseUrl ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Giấy phép KD: {businessLicenseUrl ? "Đã có" : "Thiếu ảnh"}
            </span>
          </div>
        </div>

        {/* Cam kết */}
        <div className="p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            Bằng việc nhấn <strong>&quot;Gửi hồ sơ thẩm định&quot;</strong>, bạn cam kết rằng mọi thông tin định danh và tài liệu pháp lý cung cấp là hoàn toàn chính xác, hợp pháp và thuộc quyền sở hữu của cơ sở kinh doanh. UFind có quyền từ chối hoặc vô hiệu hóa hồ sơ nếu phát hiện thông tin giả mạo.
          </p>
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-2 border-b border-slate-200 dark:border-white/10">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Xem văn bản gốc</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[84vh]">
              <img
                src={zoomImage}
                alt="Xem văn bản lớn"
                className="max-h-[80vh] max-w-[86vw] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
