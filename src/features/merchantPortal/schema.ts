import { z } from "zod";

export const onboardingSchema = z.object({
  // Bước 1: Thông tin quán & Vị trí
  restaurantName: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập tên quán (tối thiểu 2 ký tự)"),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(/^[0-9+()\-\s]{8,20}$/, "Số điện thoại không hợp lệ"),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Định dạng email không hợp lệ"),
  address: z.string().trim().min(5, "Vui lòng nhập địa chỉ chi tiết của quán"),
  latitude: z
    .number()
    .refine((val) => val !== 0, "Vui lòng chọn vị trí quán trên bản đồ"),
  longitude: z
    .number()
    .refine((val) => val !== 0, "Vui lòng chọn vị trí quán trên bản đồ"),
  description: z.string().trim().optional().default(""),

  // Bước 2: Ảnh quán thực tế (Mặt tiền / Biển hiệu hoặc Không gian quán)
  logoUploadDataUrl: z.string().optional(),
  logoUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng tải lên ít nhất 1 ảnh biển hiệu hoặc không gian quán"),
  storePhoto2UploadDataUrl: z.string().optional(),
  storePhoto2Url: z.string().optional().default(""),

  // Bước 3: Hồ sơ pháp lý & Định danh (BẮT BUỘC)
  representativeName: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập họ và tên chủ quán / người đại diện"),
  idCardNumber: z
    .string()
    .trim()
    .optional()
    .default(""),
  idCardFrontUploadDataUrl: z.string().optional(),
  idCardFrontUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng tải ảnh CCCD mặt trước"),
  idCardBackUploadDataUrl: z.string().optional(),
  idCardBackUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng tải ảnh CCCD mặt sau"),
  businessLicenseUploadDataUrl: z.string().optional(),
  businessLicenseUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng tải ảnh Giấy phép kinh doanh (Hộ KD hoặc Doanh nghiệp)"),
  businessLicenseNumber: z.string().trim().optional().default(""),

  // Giá trị mặc định tương thích hệ thống
  restaurantType: z.string().optional().default("Quán ăn / Đồ uống"),
  mainDishType: z.string().optional().default("Món đặc trưng"),
  priceRange: z.string().optional().default("Tự động theo menu"),
  openingHours: z
    .string()
    .optional()
    .default("Chưa thiết lập (Chủ quán cài đặt sau)"),
  menu: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().optional().default(""),
        price: z.number().default(0),
        imageUrl: z.string().optional().default(""),
        imageUploadDataUrl: z.string().optional(),
        category: z.string().optional().default(""),
        cuisine: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

export type OnboardingFormValues = z.input<typeof onboardingSchema>;
export type OnboardingSchema = z.output<typeof onboardingSchema>;
