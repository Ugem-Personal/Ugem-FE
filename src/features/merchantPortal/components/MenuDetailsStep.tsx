import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { OnboardingFormValues } from "../schema";
import { getCategories } from "@/shared/services/categoryService";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";
import type { Category } from "@/shared/types";

type Props = {
  control: Control<OnboardingFormValues>;
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  setValue: UseFormSetValue<OnboardingFormValues>;
};

export function MenuDetailsStep({
  control,
  register,
  errors,
  setValue,
}: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "menu",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadedFileNamesById, setUploadedFileNamesById] = useState<
    Record<string, string>
  >({});
  const [uploadingById, setUploadingById] = useState<Record<string, boolean>>(
    {},
  );
  const [uploadErrorsById, setUploadErrorsById] = useState<
    Record<string, string>
  >({});

  const menuValues = useWatch({
    control,
    name: "menu",
  });

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error) => {
        console.error("Không tải được danh mục:", error);
      });
  }, []);

  async function handleUpload(index: number, file?: File) {
    if (!file) return;
    const fieldId = fields[index]?.id ?? String(index);

    setUploadedFileNamesById((previous) => ({
      ...previous,
      [fieldId]: file.name,
    }));
    setUploadingById((previous) => ({ ...previous, [fieldId]: true }));
    setUploadErrorsById((previous) => ({ ...previous, [fieldId]: "" }));

    try {
      validateImageFile(file);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file"));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setValue(`menu.${index}.imageUploadDataUrl`, dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      const imageUrl = await uploadImage(file);

      setValue(`menu.${index}.imageUrl`, imageUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      console.error("Không thể tải ảnh lên:", error);
      setValue(`menu.${index}.imageUrl`, "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`menu.${index}.imageUploadDataUrl`, "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setUploadedFileNamesById((previous) => ({
        ...previous,
        [fieldId]: "Chưa chọn ảnh",
      }));
      setUploadErrorsById((previous) => ({
        ...previous,
        [fieldId]:
          error instanceof Error
            ? error.message
            : "Tải ảnh thất bại. Vui lòng thử lại.",
      }));
    } finally {
      setUploadingById((previous) => ({ ...previous, [fieldId]: false }));
    }
  }

  return (
    <section className="onboarding-card">
      <h2>Thực đơn & hình ảnh</h2>

      <div className="menu-list">
        {fields.map((field, index) => (
          <article className="menu-item-card" key={field.id}>
            <div className="menu-item-title">
              <strong>Món #{index + 1}</strong>

              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <label>
              <span>Tên món *</span>
              <input
                placeholder="Ví dụ: Bún bò Huế"
                {...register(`menu.${index}.name`)}
              />
              {errors.menu?.[index]?.name && (
                <small>{errors.menu[index]?.name?.message}</small>
              )}
            </label>

            <label>
              <span>Mô tả món *</span>
              <input
                placeholder="Mô tả ngắn về món"
                {...register(`menu.${index}.description`)}
              />
              {errors.menu?.[index]?.description && (
                <small>{errors.menu[index]?.description?.message}</small>
              )}
            </label>

            <div className="two-cols">
              <label>
                <span>Giá *</span>
                <input
                  type="number"
                  placeholder="45000"
                  min="1000"
                  step="1000"
                  {...register(`menu.${index}.price`, {
                    valueAsNumber: true,
                    validate: (value) => {
                      if (!value || value < 1000) {
                        return "Giá phải ≥ 1000đ";
                      }
                      return true;
                    },
                  })}
                />
                {errors.menu?.[index]?.price && (
                  <small>{errors.menu[index]?.price?.message}</small>
                )}
              </label>

              <label>
                <span>Danh mục</span>
                <select {...register(`menu.${index}.category`)}>
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="menu-upload-field">
              <span>Tải ảnh từ máy</span>
              <div className="file-upload-row">
                <input
                  id={`menu-image-upload-${field.id}`}
                  className="file-upload-input"
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  onChange={(event) =>
                    handleUpload(index, event.target.files?.[0])
                  }
                />
                <label
                  className="file-upload-button"
                  htmlFor={`menu-image-upload-${field.id}`}
                >
                  Chọn ảnh
                </label>
                <span className="file-upload-name">
                  {uploadingById[field.id]
                    ? "Đang tải ảnh..."
                    : uploadedFileNamesById[field.id] || "Chưa chọn ảnh"}
                </span>
              </div>
              {uploadErrorsById[field.id] && (
                <small>{uploadErrorsById[field.id]}</small>
              )}
              {errors.menu?.[index]?.imageUrl && (
                <small>{errors.menu[index]?.imageUrl?.message}</small>
              )}

              {(() => {
                const uploadSrc = menuValues?.[index]?.imageUploadDataUrl || menuValues?.[index]?.imageUrl;
                if (!uploadSrc || (!uploadSrc.trim().startsWith("data:image/") && !uploadSrc.trim().startsWith("http"))) {
                  return null;
                }

                return (
                  <div className="menu-image-preview">
                    <img
                      src={uploadSrc}
                      alt={`Ảnh món #${index + 1} (Upload)`}
                      loading="lazy"
                    />
                  </div>
                );
              })()}
            </div>
          </article>
        ))}
      </div>

      {typeof errors.menu?.message === "string" && (
        <small>{errors.menu.message}</small>
      )}

      <button
        className="add-menu-button"
        type="button"
        onClick={() =>
          append({
            name: "",
            description: "",
            price: 0,
            imageUrl: "",
            imageUploadDataUrl: "",
            category: "",
          })
        }
      >
        <Plus size={18} />
        Thêm món
      </button>
    </section>
  );
}
