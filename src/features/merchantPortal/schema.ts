import { z } from "zod";

export const onboardingSchema = z.object({
  restaurantName: z.string().min(1, "Vui lòng nhập tên quán"),
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(/^0\d{9}$/, "Số điện thoại không hợp lệ"),

  restaurantType: z.string().min(1, "Vui lòng chọn loại hình quán"),
  mainDishType: z.string().min(1, "Vui lòng chọn loại món chính"),
  priceRange: z.string().min(1, "Vui lòng chọn khoảng giá"),
  openingHours: z.string().min(1, "Vui lòng nhập giờ mở cửa"),

  description: z.string().optional(),

  address: z.string().min(1, "Vui lòng nhập địa chỉ"),
  latitude: z
    .number()
    .refine((val) => val !== 0, "Vui lòng chọn vị trí trên bản đồ"),
  longitude: z
    .number()
    .refine((val) => val !== 0, "Vui lòng chọn vị trí trên bản đồ"),

  logoUploadDataUrl: z.string().optional(),
  logoUrl: z.string().min(1, "Vui lòng tải logo quán").default(""),

  menu: z
    .array(
      z.object({
        name: z.string().min(1, "Vui lòng nhập tên món"),
        description: z.string().min(1, "Vui lòng nhập mô tả món"),
        price: z
          .number()
          .positive("Giá phải lớn hơn 0")
          .min(1000, "Giá tối thiểu 1000đ"),
        imageUrl: z.string().min(1, "Vui lòng tải ảnh món"),
        imageUploadDataUrl: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .min(1, "Vui lòng thêm ít nhất 1 món"),
});

export type OnboardingFormValues = z.input<typeof onboardingSchema>;
export type OnboardingSchema = z.output<typeof onboardingSchema>;
