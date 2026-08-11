import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
import {
  ChevronLeft,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Search,
  Filter,
  Sparkles,
  UtensilsCrossed,
  RefreshCw,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronRight,
} from "lucide-react";

import {
  createFood,
  deleteFood,
  getFoods,
  updateFood,
  updateFoodAvailability,
} from "../services/foodService";
import type { Food } from "../types";
import { getCategories } from "@/shared/services/categoryService";
import type { Category } from "@/shared/types";
import {
  CUISINE_OPTIONS,
  getCategoryDisplayName,
  isFoodTypeCategoryName,
} from "@/shared/utils/category";
import {
  IMAGE_UPLOAD_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/shared/services/mediaService";
import {
  createFoodTopping,
  deleteFoodTopping,
  getFoodToppings,
  type FoodTopping,
} from "@/shared/services/foodToppingService";
import { notify } from "@/shared/lib/notify";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import ImageWithFallback from "@/shared/components/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

export function MerchantFoodsPage() {
  const handleBack = useSafeBack("/merchant");
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCat = searchParams.get("category") || "all";
  const initialStatus =
    (searchParams.get("status") as "all" | "available" | "unavailable") || "all";

  // Data state
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(initialCat);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "unavailable">(initialStatus);

  // Form state (Create / Edit)
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    cuisine: "",
    categoryIds: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    price?: string;
    categoryIds?: string;
  }>({});

  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Action states
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<string | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [deletingFood, setDeletingFood] = useState(false);

  // Topping Modal state
  const [toppingModalFood, setToppingModalFood] = useState<Food | null>(null);
  const [toppings, setToppings] = useState<FoodTopping[]>([]);
  const [loadingToppings, setLoadingToppings] = useState(false);
  const [savingTopping, setSavingTopping] = useState(false);
  const [deletingToppingId, setDeletingToppingId] = useState<string | null>(null);
  const [newToppingForm, setNewToppingForm] = useState({ name: "", price: "" });
  const [toppingError, setToppingError] = useState<string | null>(null);

  // Load initial data
  async function loadData() {
    setLoading(true);
    setLoadError(null);

    try {
      const [foodData, categoryData] = await Promise.all([
        getFoods(),
        getCategories(),
      ]);

      setFoods(foodData);
      setCategories(categoryData);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Không thể tải danh sách món ăn.";
      setLoadError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  const foodTypeCategories = useMemo(
    () => categories.filter((category) => isFoodTypeCategoryName(category.name)),
    [categories],
  );

  // Filtered foods calculation
  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      // Search query filter
      const matchesSearch =
        !searchQuery.trim() ||
        food.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (food.description &&
          food.description.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (food.cuisine &&
          food.cuisine.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      // Category filter
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        food.categoryIds?.includes(selectedCategoryFilter) ||
        food.categories?.some((c) => c.id === selectedCategoryFilter);

      // Status filter
      const isAvail = food.isAvailable ?? true;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" && isAvail) ||
        (statusFilter === "unavailable" && !isAvail);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [foods, searchQuery, selectedCategoryFilter, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = foods.length;
    const available = foods.filter((f) => f.isAvailable ?? true).length;
    const unavailable = total - available;
    const totalCategories = foodTypeCategories.length;
    return { total, available, unavailable, totalCategories };
  }, [foods, foodTypeCategories]);

  // Image Upload handler
  async function handleImageUpload(file?: File) {
    if (!file) return;

    setUploadingImage(true);
    setImageFileName(file.name);

    try {
      validateImageFile(file);

      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setImagePreview(preview);

      const uploadedUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      setImagePreview(uploadedUrl);
      notify.success("Tải ảnh món ăn thành công.");
    } catch (error) {
      console.error(error);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
      setImagePreview("");
      setImageFileName("");
      notify.error(
        error instanceof Error
          ? error.message
          : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function clearImage() {
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    setImagePreview("");
    setImageFileName("");
  }

  // Mỗi món chỉ thuộc một loại món; nền ẩm thực được lưu riêng.
  function toggleCategorySelection(categoryId: string) {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      const nextIds = exists ? [] : [categoryId];

      if (nextIds.length > 0 && formErrors.categoryIds) {
        setFormErrors((e) => ({ ...e, categoryIds: undefined }));
      }

      return { ...prev, categoryIds: nextIds };
    });
  }

  // Validate form inputs
  function validateForm() {
    const errors: typeof formErrors = {};
    const trimmedName = form.name.trim();
    const priceNum = Number(form.price);

    if (!trimmedName) {
      errors.name = "Vui lòng nhập tên món ăn.";
    } else if (trimmedName.length > 150) {
      errors.name = "Tên món ăn không quá 150 ký tự.";
    }

    if (!form.price || isNaN(priceNum) || priceNum <= 0) {
      errors.price = "Giá món ăn phải lớn hơn 0 ₫.";
    } else if (priceNum > 1_000_000_000) {
      errors.price = "Giá món ăn không vượt quá 1.000.000.000 ₫.";
    }

    if (form.categoryIds.length === 0) {
      errors.categoryIds = "Vui lòng chọn ít nhất 1 danh mục.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Create or Update Food submit
  async function handleSubmitFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      notify.error("Vui lòng kiểm tra các trường dữ liệu còn thiếu.");
      return;
    }

    if (uploadingImage) {
      notify.error("Vui lòng đợi ảnh tải lên hoàn tất.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        imageUrl: form.imageUrl.trim() || undefined,
        cuisine: form.cuisine || undefined,
        isAvailable: true,
        categoryIds: form.categoryIds,
      };

      if (editingFoodId) {
        await updateFood(editingFoodId, payload);
        notify.success("Cập nhật món ăn thành công.");
      } else {
        await createFood(payload);
        notify.success("Thêm món ăn thành công.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error
          ? error.message
          : editingFoodId
          ? "Cập nhật món ăn thất bại."
          : "Tạo món ăn thất bại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      cuisine: "",
      categoryIds: [],
    });
    setFormErrors({});
    setImagePreview("");
    setImageFileName("");
    setEditingFoodId(null);
  }

  function startEditingFood(food: Food) {
    setEditingFoodId(food.id);

    const selectedFoodTypeId = food.categories?.find((category) =>
      isFoodTypeCategoryName(category.name),
    )?.id;

    setForm({
      name: food.name,
      description: food.description ?? "",
      price: String(food.price),
      imageUrl: food.imageUrl ?? "",
      cuisine: food.cuisine ?? "",
      categoryIds: selectedFoodTypeId ? [selectedFoodTypeId] : [],
    });
    setFormErrors({});
    setImagePreview(food.imageUrl ?? "");
    setImageFileName("");

    const formElement = document.getElementById("merchant-food-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Availability Toggle
  async function handleAvailabilityChange(food: Food) {
    setUpdatingAvailabilityId(food.id);
    const newStatus = !(food.isAvailable ?? true);

    try {
      await updateFoodAvailability(food.id, newStatus);
      setFoods((prev) =>
        prev.map((f) => (f.id === food.id ? { ...f, isAvailable: newStatus } : f)),
      );
      notify.success(
        newStatus
          ? `Món "${food.name}" đã được chuyển sang trạng thái Đang bán.`
          : `Món "${food.name}" đã chuyển sang Tạm ẩn.`,
      );
    } catch (error) {
      console.error(error);
      notify.error("Không thể thay đổi trạng thái món ăn.");
    } finally {
      setUpdatingAvailabilityId(null);
    }
  }

  // Delete Food
  async function confirmDeleteFood() {
    if (!foodToDelete) return;

    setDeletingFood(true);

    try {
      await deleteFood(foodToDelete.id);
      notify.success(`Đã xóa món "${foodToDelete.name}".`);
      setFoods((prev) => prev.filter((f) => f.id !== foodToDelete.id));
      setFoodToDelete(null);
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error
          ? error.message
          : "Xóa món thất bại. Món ăn có thể đang có trong đơn hàng.",
      );
    } finally {
      setDeletingFood(false);
    }
  }

  // Toppings Management Modal
  async function openToppingModal(food: Food) {
    setToppingModalFood(food);
    setNewToppingForm({ name: "", price: "" });
    setToppingError(null);
    setLoadingToppings(true);

    try {
      const toppingList = await getFoodToppings(food.id);
      setToppings(toppingList);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được danh sách topping.");
    } finally {
      setLoadingToppings(false);
    }
  }

  async function handleAddTopping(e: React.FormEvent) {
    e.preventDefault();

    if (!toppingModalFood) return;

    const name = newToppingForm.name.trim();
    const priceNum = Number(newToppingForm.price);

    if (!name) {
      setToppingError("Vui lòng nhập tên topping.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setToppingError("Giá topping không được âm.");
      return;
    }

    setToppingError(null);
    setSavingTopping(true);

    try {
      await createFoodTopping({
        foodId: toppingModalFood.id,
        name,
        price: priceNum,
      });

      notify.success(`Đã thêm topping "${name}".`);
      setNewToppingForm({ name: "", price: "" });

      // Refresh toppings list
      const updatedList = await getFoodToppings(toppingModalFood.id);
      setToppings(updatedList);
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error ? error.message : "Thêm topping thất bại.",
      );
    } finally {
      setSavingTopping(false);
    }
  }

  async function handleDeleteTopping(toppingId?: string, toppingName?: string) {
    if (!toppingId || !toppingModalFood) return;

    setDeletingToppingId(toppingId);

    try {
      await deleteFoodTopping(toppingId);
      notify.success(`Đã xóa topping "${toppingName || ""}".`);
      setToppings((prev) => prev.filter((t) => t.id !== toppingId));
    } catch (error) {
      console.error(error);
      notify.error("Xóa topping thất bại.");
    } finally {
      setDeletingToppingId(null);
    }
  }

  return (
    <main className="merchant-portal-layout bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative min-h-screen flex">
      {/* Background Decorators */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:32px_32px]" />

      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content px-4 py-6 sm:px-8 sm:py-8">
          {/* Top Nav & Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="mb-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-800/80 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-700"
              >
                <ChevronLeft size={16} />
                Quay lại
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                <UtensilsCrossed size={14} />
                <span>Merchant Portal</span>
                <ChevronRight size={12} className="text-slate-400" />
                <span>Thực đơn</span>
              </div>

              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Quản lý món ăn
                <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
              </h1>
            </div>

            {/* Header Summary Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 px-3.5 py-2 shadow-xs backdrop-blur-md">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng món:</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-3.5 py-2 shadow-xs backdrop-blur-md">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Đang bán:</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">{stats.available}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/40 px-3.5 py-2 shadow-xs backdrop-blur-md">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Tạm ẩn:</span>
                <span className="text-sm font-black text-amber-800 dark:text-amber-300">{stats.unavailable}</span>
              </div>
            </div>
          </div>

          {/* Form Card (Create / Edit) */}
          <div
            id="merchant-food-form"
            className="mb-8 relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                  {editingFoodId ? <Pencil size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingFoodId ? "Cập nhật thông tin món" : "Thêm món ăn mới"}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {editingFoodId
                      ? "Thay đổi giá, tên, mô tả hoặc danh mục món ăn."
                      : "Điền các thông tin để bổ sung món mới vào thực đơn Merchant."}
                  </p>
                </div>
              </div>

              {editingFoodId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-200"
                >
                  <X size={14} />
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitFood} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tên món */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      Tên món ăn <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {form.name.length}/150
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) setFormErrors((err) => ({ ...err, name: undefined }));
                    }}
                    placeholder="Ví dụ: Phở bò đặc biệt"
                    className={`w-full rounded-2xl border bg-white/60 dark:bg-slate-900/60 px-4 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 dark:text-white ${
                      formErrors.name
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                      <AlertTriangle size={12} /> {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Giá món */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      Giá món ăn (VNĐ) <span className="text-rose-500">*</span>
                    </span>
                    {Number(form.price) > 0 && (
                      <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
                        = {Number(form.price).toLocaleString("vi-VN")} ₫
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={form.price}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, price: e.target.value }));
                      if (formErrors.price) setFormErrors((err) => ({ ...err, price: undefined }));
                    }}
                    placeholder="45000"
                    className={`w-full rounded-2xl border bg-white/60 dark:bg-slate-900/60 px-4 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 dark:text-white ${
                      formErrors.price
                        ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    }`}
                  />
                  {formErrors.price && (
                    <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                      <AlertTriangle size={12} /> {formErrors.price}
                    </p>
                  )}
                </div>

                {/* Mô tả */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Mô tả món ăn
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Đậy nắp giữ nóng, vị đậm đà truyền thống..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 px-4 py-3 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:text-white resize-none"
                  />
                </div>

                {/* Ảnh món */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Hình ảnh minh họa
                  </label>
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <ImageWithFallback
                          src={imagePreview || form.imageUrl}
                          alt="Ảnh xem trước"
                          fallbackIcon={<ImagePlus className="h-6 w-6 text-slate-400" />}
                        />
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Tải lên ảnh đẹp để thu hút khách đặt món (JPG, PNG, GIF, WebP &lt; 5MB)
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <input
                            id="food-image-file-input"
                            type="file"
                            accept={IMAGE_UPLOAD_ACCEPT}
                            className="sr-only"
                            onChange={(e) => {
                              void handleImageUpload(e.target.files?.[0]);
                              e.currentTarget.value = "";
                            }}
                          />
                          <label
                            htmlFor="food-image-file-input"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-sm transition hover:opacity-90"
                          >
                            {uploadingImage ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ImagePlus size={14} />
                            )}
                            {uploadingImage ? "Đang xử lý ảnh..." : "Chọn ảnh từ máy"}
                          </label>

                          {(imagePreview || form.imageUrl) && (
                            <button
                              type="button"
                              onClick={clearImage}
                              disabled={uploadingImage}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100"
                            >
                              <X size={14} />
                              Xóa ảnh
                            </button>
                          )}
                        </div>
                        {imageFileName && (
                          <p className="text-[11px] font-medium text-slate-400 truncate max-w-xs">
                            File: {imageFileName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loại món */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      Loại món <span className="text-rose-500">*</span>
                    </span>
                  </label>

                  {foodTypeCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có loại món khả dụng nào.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {foodTypeCategories.map((cat) => {
                        const selected = form.categoryIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleCategorySelection(cat.id)}
                            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${
                              selected
                                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 shadow-xs ring-1 ring-cyan-500/20"
                                : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            <Tag size={13} className={selected ? "text-cyan-600" : "text-slate-400"} />
                            {getCategoryDisplayName(cat.name)}
                            {selected && <CheckCircle2 size={13} className="text-cyan-600 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formErrors.categoryIds && (
                    <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                      <AlertTriangle size={12} /> {formErrors.categoryIds}
                    </p>
                  )}
                </div>

                {/* Nền ẩm thực */}
                <label className="space-y-2 md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Nền ẩm thực <span className="font-semibold normal-case tracking-normal text-slate-400">(không bắt buộc)</span>
                  </span>
                  <select
                    value={form.cuisine}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        cuisine: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                  >
                    <option value="">Chọn nền ẩm thực</option>
                    {CUISINE_OPTIONS.map((cuisine) => (
                      <option key={cuisine} value={cuisine}>
                        {cuisine}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                {editingFoodId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-6 text-sm font-extrabold shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting || uploadingImage ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingFoodId ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {uploadingImage
                    ? "Đang tải ảnh..."
                    : submitting
                    ? "Đang lưu..."
                    : editingFoodId
                    ? "Lưu thay đổi"
                    : "Tạo món ăn"}
                </button>
              </div>
            </form>
          </div>

          {/* Search, Filter & List Section */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200/60 dark:border-slate-800">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tên hoặc mô tả món ăn..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:text-white placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Category Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCategoryFilter(val);
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("category", val);
                        return next;
                      }, { replace: true });
                    }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="all">Tất cả loại món ({foodTypeCategories.length})</option>
                    {foodTypeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryDisplayName(c.name)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("status", "all");
                        return next;
                      }, { replace: true });
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      statusFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("available");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("status", "available");
                        return next;
                      }, { replace: true });
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      statusFilter === "available"
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Đang bán
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("unavailable");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("status", "unavailable");
                        return next;
                      }, { replace: true });
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      statusFilter === "unavailable"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Tạm ẩn
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {loadError && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                  <span>{loadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  <RefreshCw size={12} /> Thử lại
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className="grid gap-5 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex gap-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-4 animate-pulse bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="h-24 w-24 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !loadError && filteredFoods.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 mb-4 shadow-inner">
                  <UtensilsCrossed size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all"
                    ? "Không tìm thấy món ăn phù hợp"
                    : "Chưa có món ăn nào"}
                </h3>
                <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
                  {searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all"
                    ? "Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm tên khác."
                    : "Bắt đầu thêm các món ăn hấp dẫn vào thực đơn Merchant ngay bên trên."}
                </p>

                {(searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100"
                  >
                    <RefreshCw size={12} /> Đặt lại bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Foods Grid / Cards */}
            {!loading && !loadError && filteredFoods.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredFoods.map((food) => {
                  const isAvail = food.isAvailable ?? true;
                  const isUpdatingAvail = updatingAvailabilityId === food.id;
                  const foodTypeCategoriesForCard = (food.categories ?? []).filter(
                    (category) => isFoodTypeCategoryName(category.name),
                  );

                  return (
                    <div
                      key={food.id}
                      className={`group relative flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        isAvail
                          ? "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90"
                          : "border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 opacity-80"
                      }`}
                    >
                      <div>
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <ImageWithFallback
                              src={food.imageUrl}
                              alt={food.name}
                            />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                                {food.name}
                              </h3>

                              {/* Action Buttons */}
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditingFood(food)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-100"
                                  aria-label={`Sửa món ${food.name}`}
                                >
                                  <Pencil size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFoodToDelete(food)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition hover:bg-rose-100"
                                  aria-label={`Xóa món ${food.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Description */}
                            {food.description && (
                              <p className="line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {food.description}
                              </p>
                            )}

                            {/* Price & Status Toggle */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <span className="text-base font-black text-cyan-600 dark:text-cyan-400">
                                {Number(food.price).toLocaleString("vi-VN")} ₫
                              </span>

                              <button
                                type="button"
                                disabled={isUpdatingAvail}
                                onClick={() => void handleAvailabilityChange(food)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border transition active:scale-95 disabled:opacity-50 ${
                                  isAvail
                                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                                    : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                                }`}
                              >
                                {isUpdatingAvail ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : isAvail ? (
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                ) : (
                                  <XCircle size={12} className="text-amber-600" />
                                )}
                                {isAvail ? "Đang bán" : "Tạm ẩn"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Categories & Toppings Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {/* Categories Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {foodTypeCategoriesForCard.length > 0 ? (
                            foodTypeCategoriesForCard.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                              >
                                <Tag size={10} className="text-slate-400" />
                                {getCategoryDisplayName(c.name)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 italic">
                              Chưa chọn loại món
                            </span>
                          )}
                          {food.cuisine ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                              <Sparkles size={10} />
                              {food.cuisine}
                            </span>
                          ) : null}
                        </div>

                        {/* Manage Toppings Button */}
                        <button
                          type="button"
                          onClick={() => void openToppingModal(food)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-600"
                        >
                          <Layers size={13} />
                          <span>Topping & Đồ thêm</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dialog Confirm Delete Food */}
      <Dialog open={Boolean(foodToDelete)} onOpenChange={(open) => !open && setFoodToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Xác nhận xóa món ăn
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
              Bạn có chắc chắn muốn xóa món <span className="font-extrabold text-slate-900 dark:text-white">"{foodToDelete?.name}"</span>? Hành động này sẽ gỡ món ăn ra khỏi thực đơn của Merchant.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <button
              type="button"
              disabled={deletingFood}
              onClick={() => setFoodToDelete(null)}
              className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              disabled={deletingFood}
              onClick={() => void confirmDeleteFood()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 text-white px-5 text-xs font-extrabold shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
            >
              {deletingFood ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deletingFood ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Toppings Management */}
      <Dialog open={Boolean(toppingModalFood)} onOpenChange={(open) => !open && setToppingModalFood(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Layers className="h-5 w-5 text-cyan-600" />
              Quản lý Topping - {toppingModalFood?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Thêm các đồ ăn kèm hoặc lựa chọn cộng thêm giá cho món này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Form thêm Topping mới */}
            <form onSubmit={handleAddTopping} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Thêm Topping mới
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newToppingForm.name}
                  onChange={(e) => setNewToppingForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Tên topping (ví dụ: Trứng ốp la)"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:border-cyan-500 dark:text-white"
                />

                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newToppingForm.price}
                  onChange={(e) => setNewToppingForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Giá cộng thêm (VNĐ)"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:border-cyan-500 dark:text-white"
                />
              </div>

              {toppingError && (
                <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> {toppingError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingTopping}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-cyan-700 disabled:opacity-50"
                >
                  {savingTopping ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {savingTopping ? "Đang thêm..." : "Thêm Topping"}
                </button>
              </div>
            </form>

            {/* Danh sách Topping hiện tại */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Danh sách Topping ({toppings.length})
              </span>

              {loadingToppings && (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                  <Loader2 size={16} className="animate-spin" /> Đang tải danh sách topping...
                </div>
              )}

              {!loadingToppings && toppings.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Món ăn này chưa có topping nào.
                </p>
              )}

              {!loadingToppings && toppings.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {toppings.map((topping) => (
                    <div
                      key={topping.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-2xs"
                    >
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                          {topping.name}
                        </span>
                        <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
                          + {Number(topping.price ?? 0).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={deletingToppingId === topping.id}
                        onClick={() => void handleDeleteTopping(topping.id, topping.name)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 disabled:opacity-50"
                        aria-label={`Xóa topping ${topping.name}`}
                      >
                        {deletingToppingId === topping.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setToppingModalFood(null)}
              className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
