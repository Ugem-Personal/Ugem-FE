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

  // Inline Add-ons / Toppings in main form
  const [formToppings, setFormToppings] = useState<
    { name: string; price: number; id?: string }[]
  >([]);
  const [newInlineTopping, setNewInlineTopping] = useState({
    name: "",
    price: "",
  });

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

  const foodTypeCategories = useMemo(() => {
    const list = categories.filter((category) =>
      isFoodTypeCategoryName(category.name),
    );
    const PRIORITY_ORDER = [
      "Món chính",
      "Đồ uống",
      "Món ăn nhẹ",
      "Món khai vị",
      "Món tráng miệng",
    ];
    return list.sort((a, b) => {
      const aName = getCategoryDisplayName(a.name);
      const bName = getCategoryDisplayName(b.name);
      const aIdx = PRIORITY_ORDER.indexOf(aName);
      const bIdx = PRIORITY_ORDER.indexOf(bName);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
  }, [categories]);

  const defaultMainDishCategoryId = useMemo(() => {
    const mainDish = foodTypeCategories.find(
      (cat) => getCategoryDisplayName(cat.name) === "Món chính",
    );
    return mainDish?.id ?? foodTypeCategories[0]?.id ?? "";
  }, [foodTypeCategories]);

  useEffect(() => {
    if (!editingFoodId && defaultMainDishCategoryId) {
      setForm((prev) => {
        if (prev.categoryIds.length === 0) {
          return { ...prev, categoryIds: [defaultMainDishCategoryId] };
        }
        return prev;
      });
    }
  }, [defaultMainDishCategoryId, editingFoodId]);

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

  // Mỗi món chỉ thuộc một loại món
  function toggleCategorySelection(categoryId: string) {
    setForm((prev) => ({
      ...prev,
      categoryIds: [categoryId],
    }));
    if (formErrors.categoryIds) {
      setFormErrors((e) => ({ ...e, categoryIds: undefined }));
    }
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
      if (defaultMainDishCategoryId) {
        form.categoryIds = [defaultMainDishCategoryId];
      } else {
        errors.categoryIds = "Vui lòng chọn loại món.";
      }
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

        // Tạo các món ăn kèm mới thêm chưa có id
        const newToppings = formToppings.filter((t) => !t.id);
        if (newToppings.length > 0) {
          await Promise.all(
            newToppings.map((t) =>
              createFoodTopping({
                foodId: editingFoodId,
                name: t.name,
                price: t.price,
              }),
            ),
          );
        }
        notify.success("Cập nhật món ăn thành công.");
      } else {
        const createdRes = await createFood(payload);
        const createdId =
          (createdRes as any)?.data?.id ??
          (createdRes as any)?.data?.foodId ??
          (createdRes as any)?.id ??
          (createdRes as any)?.foodId;

        if (createdId && formToppings.length > 0) {
          await Promise.all(
            formToppings.map((t) =>
              createFoodTopping({
                foodId: createdId,
                name: t.name,
                price: t.price,
              }),
            ),
          );
        }

        notify.success(
          formToppings.length > 0
            ? `Thêm món ăn và ${formToppings.length} món thêm / topping thành công!`
            : "Thêm món ăn thành công.",
        );
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
      categoryIds: defaultMainDishCategoryId ? [defaultMainDishCategoryId] : [],
    });
    setFormToppings([]);
    setNewInlineTopping({ name: "", price: "" });
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

    // Load existing toppings
    const existing = (food.toppings ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
    }));
    setFormToppings(existing);
    setNewInlineTopping({ name: "", price: "" });

    const formElement = document.getElementById("merchant-food-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleAddInlineTopping() {
    const name = newInlineTopping.name.trim();
    const price = Number(newInlineTopping.price);

    if (!name) {
      notify.error("Vui lòng nhập tên món thêm hoặc topping.");
      return;
    }
    if (isNaN(price) || price < 0) {
      notify.error("Giá món thêm không được âm.");
      return;
    }

    setFormToppings((prev) => [...prev, { name, price }]);
    setNewInlineTopping({ name: "", price: "" });
  }

  async function handleRemoveInlineTopping(index: number, toppingId?: string) {
    if (toppingId) {
      try {
        await deleteFoodTopping(toppingId);
        notify.success("Đã xóa lựa chọn món thêm / topping.");
      } catch (error) {
        console.error(error);
        notify.error("Không thể xóa món thêm / topping.");
        return;
      }
    }
    setFormToppings((prev) => prev.filter((_, i) => i !== index));
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
      setToppingError("Vui lòng nhập tên món ăn kèm / đồ gọi thêm.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setToppingError("Giá cộng thêm không được âm.");
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

      notify.success(`Đã thêm món ăn kèm "${name}".`);
      setNewToppingForm({ name: "", price: "" });

      // Refresh toppings list
      const updatedList = await getFoodToppings(toppingModalFood.id);
      setToppings(updatedList);
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error ? error.message : "Thêm món ăn kèm thất bại.",
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
      notify.success(`Đã xóa món ăn kèm "${toppingName || ""}".`);
      setToppings((prev) => prev.filter((t) => t.id !== toppingId));
    } catch (error) {
      console.error(error);
      notify.error("Xóa món ăn kèm thất bại.");
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Mô tả món ăn</span>
                    <span className="text-[11px] font-semibold text-slate-400 normal-case tracking-normal">
                      (không bắt buộc)
                    </span>
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
                    <span className="flex items-center gap-2">
                      <span>Loại món</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 normal-case tracking-normal">
                        Mặc định: Món chính
                      </span>
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

                {/* Món thêm / Topping ngay trong form */}
                <div className="space-y-3 md:col-span-2 rounded-2xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-slate-900/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <UtensilsCrossed size={14} className="text-cyan-600 dark:text-cyan-400" />
                      <span>Món thêm / Topping</span>
                      <span className="text-[11px] font-semibold text-slate-400 normal-case tracking-normal">
                        (tùy chọn)
                      </span>
                    </label>
                    {formToppings.length > 0 && (
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        Đã thêm {formToppings.length} món thêm/topping
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Thêm danh sách món thêm (Trứng ốp la, Chả thêm, Sườn...) hoặc topping (Trân châu, Thạch...) kèm giá tiền để khách tick chọn như trên GrabFood.
                  </p>

                  {/* Ô nhập nhanh */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <input
                      type="text"
                      value={newInlineTopping.name}
                      onChange={(e) => setNewInlineTopping((prev) => ({ ...prev, name: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInlineTopping();
                        }
                      }}
                      placeholder="Tên món thêm / Topping (vd: Trứng ốp la, Trân châu)"
                      className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 shadow-2xs placeholder:text-slate-400"
                    />
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newInlineTopping.price}
                      onChange={(e) => setNewInlineTopping((prev) => ({ ...prev, price: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInlineTopping();
                        }
                      }}
                      placeholder="Giá thêm (vd: 5000)"
                      className="h-10 sm:w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 shadow-2xs placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineTopping}
                      className="h-10 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 text-xs font-black shadow-md shadow-cyan-600/20 transition"
                    >
                      <Plus size={13} />
                      Thêm vào món
                    </button>
                  </div>

                  {/* Danh sách các món ăn kèm đã thêm vào form */}
                  {formToppings.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formToppings.map((item, index) => (
                        <span
                          key={item.id ?? index}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                        >
                          <span>{item.name}</span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-extrabold font-mono">
                            +{Number(item.price).toLocaleString("vi-VN")} ₫
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleRemoveInlineTopping(index, item.id)}
                            className="ml-1 text-slate-400 hover:text-rose-600 transition"
                            title="Xóa lựa chọn này"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
                          <span>Món thêm / Topping ({food.toppings?.length ?? 0})</span>
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

      {/* Dialog Toppings / Add-ons Management */}
      <Dialog open={Boolean(toppingModalFood)} onOpenChange={(open) => !open && setToppingModalFood(null)}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200/90 shadow-2xl dark:bg-slate-900 dark:text-white dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-white text-base font-black">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/40">
                <UtensilsCrossed className="h-4.5 w-4.5" />
              </div>
              <span>Món thêm / Topping</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              Món chính: <strong className="text-cyan-700 dark:text-cyan-300 font-bold">{toppingModalFood?.name}</strong>. Danh sách món thêm (Trứng ốp la, Chả thêm, Sườn...) hoặc topping (Trân châu, Thạch...) kèm giá tiền để khách tick chọn như trên GrabFood.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Form thêm Món thêm / Topping mới */}
            <form onSubmit={handleAddTopping} className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/70 to-blue-50/40 dark:border-cyan-800/40 dark:bg-slate-800/60 p-4 sm:p-5 space-y-3 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-900 dark:text-cyan-200 block">
                Thêm Món thêm / Topping mới
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tên món thêm / Topping
                  </label>
                  <input
                    type="text"
                    value={newToppingForm.name}
                    onChange={(e) => setNewToppingForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: Trứng ốp la, Trân châu..."
                    className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Giá thêm (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newToppingForm.price}
                    onChange={(e) => setNewToppingForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="Ví dụ: 5000"
                    className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {toppingError && (
                <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> {toppingError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingTopping}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs font-black shadow-md shadow-cyan-600/25 disabled:opacity-50 transition active:scale-95"
                >
                  {savingTopping ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {savingTopping ? "Đang thêm..." : "Thêm vào danh sách"}
                </button>
              </div>
            </form>

            {/* Danh sách Món thêm / Topping hiện tại */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Danh sách Món thêm / Topping ({toppings.length})
                </span>
                {toppings.length > 0 && (
                  <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                    Khách có thể chọn khi đặt món
                  </span>
                )}
              </div>

              {loadingToppings && (
                <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-600" /> Đang tải danh sách...
                </div>
              )}

              {!loadingToppings && toppings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-6 text-center text-xs text-slate-500 font-medium">
                  Món này chưa có món thêm hay topping nào. Thêm ở trên để khách có thể chọn kèm khi đặt món như trên Grab.
                </div>
              )}

              {!loadingToppings && toppings.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {toppings.map((topping) => (
                    <div
                      key={topping.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 shadow-2xs hover:border-cyan-300 dark:hover:border-cyan-600 hover:bg-white dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {topping.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-cyan-700 dark:text-cyan-300 bg-cyan-100/70 dark:bg-cyan-950/60 border border-cyan-200/80 dark:border-cyan-800/50 px-2.5 py-1 rounded-lg font-mono">
                          + {Number(topping.price ?? 0).toLocaleString("vi-VN")} ₫
                        </span>

                        <button
                          type="button"
                          disabled={deletingToppingId === topping.id}
                          onClick={() => void handleDeleteTopping(topping.id, topping.name)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-900/40 disabled:opacity-50 shadow-2xs"
                          aria-label={`Xóa ${topping.name}`}
                          title="Xóa lựa chọn này"
                        >
                          {deletingToppingId === topping.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
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
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-6 text-xs font-black text-slate-700 dark:text-slate-200 transition shadow-xs"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
