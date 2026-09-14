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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Users,
  Minus,
  Flame,
  Check,
  Tag,
  Percent,
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
  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "single" | "combo">("all");

  // Form state (Create / Edit)
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comboFoodSearch, setComboFoodSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    cuisine: "",
    categoryIds: [] as string[],
    isCombo: false,
    servingSize: "2-3 người",
    originalPrice: "",
    comboItems: [] as { foodId: string; quantity: number }[],
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    price?: string;
    categoryIds?: string;
    comboItems?: string;
  }>({});

  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Action states
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<string | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [deletingFood, setDeletingFood] = useState(false);

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
      // Item type filter (All / Single / Combo)
      if (itemTypeFilter === "single" && food.isCombo) return false;
      if (itemTypeFilter === "combo" && !food.isCombo) return false;

      // Search query filter
      const matchesSearch =
        !searchQuery.trim() ||
        food.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (food.description &&
          food.description.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (food.cuisine &&
          food.cuisine.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (food.comboItems &&
          food.comboItems.some((ci) =>
            ci.food?.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
          ));

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
  }, [foods, searchQuery, selectedCategoryFilter, statusFilter, itemTypeFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = foods.length;
    const available = foods.filter((f) => f.isAvailable ?? true).length;
    const unavailable = total - available;
    const combos = foods.filter((f) => f.isCombo).length;
    const totalCategories = foodTypeCategories.length;
    return { total, available, unavailable, combos, totalCategories };
  }, [foods, foodTypeCategories]);

  // Combo calculations & handlers
  const singleFoods = useMemo(() => {
    return foods.filter((f) => !f.isCombo && f.id !== editingFoodId);
  }, [foods, editingFoodId]);

  const filteredSingleFoods = useMemo(() => {
    if (!comboFoodSearch.trim()) return singleFoods;
    const q = comboFoodSearch.trim().toLowerCase();
    return singleFoods.filter((f) => f.name.toLowerCase().includes(q));
  }, [singleFoods, comboFoodSearch]);

  const calculatedOriginalPrice = useMemo(() => {
    if (!form.isCombo) return 0;
    return form.comboItems.reduce((sum, item) => {
      const found = foods.find((f) => f.id === item.foodId);
      return sum + (found ? Number(found.price) * item.quantity : 0);
    }, 0);
  }, [form.isCombo, form.comboItems, foods]);

  const comboSavings = useMemo(() => {
    if (!form.isCombo) return null;
    const basePrice = Number(form.originalPrice) > 0 ? Number(form.originalPrice) : calculatedOriginalPrice;
    const salePrice = Number(form.price) || 0;
    if (basePrice <= 0 || salePrice <= 0 || salePrice >= basePrice) return null;
    const diff = basePrice - salePrice;
    const pct = Math.round((diff / basePrice) * 100);
    return { diff, pct, basePrice };
  }, [form.isCombo, form.originalPrice, form.price, calculatedOriginalPrice]);

  function handleToggleComboFood(foodId: string) {
    if (!foodId) return;
    setForm((prev) => {
      const exists = prev.comboItems.some((ci) => ci.foodId === foodId);
      if (exists) {
        return {
          ...prev,
          comboItems: prev.comboItems.filter((ci) => ci.foodId !== foodId),
        };
      }
      return {
        ...prev,
        comboItems: [...prev.comboItems, { foodId, quantity: 1 }],
      };
    });
    if (formErrors.comboItems) {
      setFormErrors((err) => ({ ...err, comboItems: undefined }));
    }
  }

  function handleUpdateComboItemQuantity(foodId: string, delta: number) {
    setForm((prev) => ({
      ...prev,
      comboItems: prev.comboItems
        .map((ci) => {
          if (ci.foodId === foodId) {
            const nextQty = ci.quantity + delta;
            return nextQty > 0 ? { ...ci, quantity: nextQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as { foodId: string; quantity: number }[],
    }));
  }

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

  // Validate form inputs
  function validateForm() {
    const errors: typeof formErrors = {};
    const trimmedName = form.name.trim();
    const priceNum = Number(form.price);

    if (!trimmedName) {
      errors.name = form.isCombo ? "Vui lòng nhập tên combo." : "Vui lòng nhập tên món ăn.";
    } else if (trimmedName.length > 150) {
      errors.name = "Tên không quá 150 ký tự.";
    }

    if (!form.price || isNaN(priceNum) || priceNum <= 0) {
      errors.price = form.isCombo ? "Giá bán combo phải lớn hơn 0 ₫." : "Giá món ăn phải lớn hơn 0 ₫.";
    } else if (priceNum > 1_000_000_000) {
      errors.price = "Giá không vượt quá 1.000.000.000 ₫.";
    }

    if (form.isCombo && form.comboItems.length === 0) {
      errors.comboItems = "Vui lòng chọn ít nhất một món ăn thành phần cho combo.";
    }

    if (form.categoryIds.length === 0) {
      const fallbackCatId = defaultMainDishCategoryId || foodTypeCategories[0]?.id || categories[0]?.id || "";
      if (fallbackCatId) {
        form.categoryIds = [fallbackCatId];
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
      const fallbackCatId = defaultMainDishCategoryId || foodTypeCategories[0]?.id || categories[0]?.id || "";
      const effectiveCategoryIds = form.categoryIds.length > 0
        ? form.categoryIds
        : (fallbackCatId ? [fallbackCatId] : []);

      const effectiveOriginalPrice = form.isCombo
        ? (Number(form.originalPrice) > 0
            ? Number(form.originalPrice)
            : (calculatedOriginalPrice > 0 ? calculatedOriginalPrice : undefined))
        : undefined;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        imageUrl: form.imageUrl.trim() || undefined,
        cuisine: form.cuisine || undefined,
        isAvailable: true,
        categoryIds: effectiveCategoryIds,
        isCombo: form.isCombo,
        servingSize: form.isCombo ? (form.servingSize?.trim() || "2-3 người") : undefined,
        originalPrice: effectiveOriginalPrice,
        comboItems: form.isCombo ? form.comboItems : undefined,
      };

      if (editingFoodId) {
        await updateFood(editingFoodId, payload);
        notify.success(form.isCombo ? "Cập nhật combo thành công." : "Cập nhật món ăn thành công.");
      } else {
        await createFood(payload);
        notify.success(form.isCombo ? "Tạo combo mới thành công." : "Thêm món ăn thành công.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      notify.error(
        error instanceof Error
          ? error.message
          : editingFoodId
          ? "Cập nhật thất bại."
          : "Tạo món/combo thất bại.",
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
      isCombo: false,
      servingSize: "2-3 người",
      originalPrice: "",
      comboItems: [],
    });
    setFormErrors({});
    setImagePreview("");
    setImageFileName("");
    setEditingFoodId(null);
    setComboFoodSearch("");
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
      isCombo: Boolean(food.isCombo),
      servingSize: food.servingSize ?? "2-3 người",
      originalPrice: food.originalPrice ? String(food.originalPrice) : "",
      comboItems: (food.comboItems ?? []).map((ci) => ({
        foodId: ci.foodId,
        quantity: ci.quantity,
      })),
    });
    setFormErrors({});
    setImagePreview(food.imageUrl ?? "");
    setImageFileName("");
    setComboFoodSearch("");

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
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Combo:</span>
                <span className="text-sm font-black text-amber-800 dark:text-amber-300">{stats.combos}</span>
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
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl font-bold ${
                  form.isCombo
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                }`}>
                  {editingFoodId ? <Pencil size={20} /> : form.isCombo ? <Sparkles size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingFoodId
                      ? (form.isCombo ? "Cập nhật Combo / Set món" : "Cập nhật thông tin món")
                      : (form.isCombo ? "Tạo Combo / Set nhóm mới" : "Thêm món ăn mới")}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {editingFoodId
                      ? "Thay đổi giá, tên, món thành phần hoặc mô tả."
                      : form.isCombo
                      ? "Gộp các món trong thực đơn thành combo nhiều người kèm ưu đãi giảm giá."
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
              {/* Type Switcher: Single Dish vs Combo */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, isCombo: false }));
                    if (formErrors.comboItems) {
                      setFormErrors((err) => ({ ...err, comboItems: undefined }));
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    !form.isCombo
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <UtensilsCrossed size={15} />
                  Món đơn lẻ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      isCombo: true,
                      servingSize: prev.servingSize || "2-3 người",
                    }));
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    form.isCombo
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs shadow-orange-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles size={15} />
                  Combo / Set nhóm (Ưu đãi giảm giá)
                </button>
              </div>

              {/* Combo Configuration Panel */}
              {form.isCombo && (
                <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10 p-5 sm:p-6 space-y-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Cấu hình món thành phần & Khẩu phần ăn
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Flame size={12} /> Tiết kiệm cho khách
                    </span>
                  </div>

                  {/* Serving size pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Khẩu phần phù hợp
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["1-2 người", "2-3 người", "3-4 người", "Gia đình (5+)"].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, servingSize: size }))}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                            form.servingSize === size
                              ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                          }`}
                        >
                          👥 {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Combo Items Multi-Select Grid */}
                  <div className="space-y-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span>Chọn các món ăn vào Combo</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tick chọn món để thêm vào combo, bấm dấu [+] hoặc [-] để tăng/giảm số lượng từng món.
                        </p>
                      </div>

                      {/* Search single foods */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={comboFoodSearch}
                          onChange={(e) => setComboFoodSearch(e.target.value)}
                          placeholder="Tìm món trong thực đơn..."
                          className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 placeholder:text-slate-400"
                        />
                        {comboFoodSearch && (
                          <button
                            type="button"
                            onClick={() => setComboFoodSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {formErrors.comboItems && (
                      <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                        <AlertTriangle size={12} /> {formErrors.comboItems}
                      </p>
                    )}

                    {/* Multi-dish interactive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredSingleFoods.length > 0 ? (
                        filteredSingleFoods.map((food) => {
                          const selectedItem = form.comboItems.find((ci) => ci.foodId === food.id);
                          const isSelected = Boolean(selectedItem);
                          const quantity = selectedItem?.quantity || 0;
                          const foodPrice = Number(food.price);

                          return (
                            <div
                              key={food.id}
                              className={`group relative flex items-center gap-3 p-2.5 rounded-2xl border transition-all select-none ${
                                isSelected
                                  ? "border-amber-500 bg-amber-500/10 dark:bg-amber-400/10 shadow-xs"
                                  : "border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:border-amber-300 dark:hover:border-amber-600/50"
                              }`}
                            >
                              {/* Clickable area for toggling selection */}
                              <div
                                onClick={() => handleToggleComboFood(food.id)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                {/* Checkbox / Plus Indicator */}
                                <div
                                  className={`h-6 w-6 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-amber-500 text-white shadow-xs scale-105"
                                      : "border-2 border-slate-300 dark:border-slate-600 text-transparent group-hover:border-amber-400 group-hover:text-amber-500"
                                  }`}
                                >
                                  {isSelected ? (
                                    <Check size={14} strokeWidth={3} />
                                  ) : (
                                    <Plus size={13} strokeWidth={2.5} />
                                  )}
                                </div>

                                {/* Food Image */}
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                  <ImageWithFallback
                                    src={food.imageUrl}
                                    alt={food.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                {/* Food Details */}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {food.name}
                                  </p>
                                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                    {foodPrice.toLocaleString("vi-VN")} ₫
                                  </p>
                                </div>
                              </div>

                              {/* Stepper controls when selected */}
                              {isSelected && (
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-amber-300 dark:border-amber-700 shadow-2xs shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateComboItemQuantity(food.id, -1);
                                    }}
                                    className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                    title="Giảm số lượng"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="px-1 text-xs font-black text-amber-700 dark:text-amber-300 min-w-[18px] text-center font-mono">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateComboItemQuantity(food.id, 1);
                                    }}
                                    className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                    title="Tăng số lượng"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-6 text-center text-xs text-slate-400">
                          {comboFoodSearch
                            ? `Không tìm thấy món nào với từ khóa "${comboFoodSearch}".`
                            : "Quán chưa có món lẻ nào trong thực đơn. Vui lòng tạo món lẻ trước khi tạo combo."}
                        </div>
                      )}
                    </div>

                    {/* Selected Summary & Original Price Banner */}
                    {form.comboItems.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 px-4 py-3 mt-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Đã chọn {form.comboItems.length} món ({form.comboItems.reduce((s, i) => s + i.quantity, 0)} phần ăn)
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Tổng giá gốc trước khi giảm (tổng tiền các món bán lẻ)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-400 block">Giá gốc (tiền lẻ):</span>
                          <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                            {calculatedOriginalPrice.toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Tên món / combo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      {form.isCombo ? "Tên Combo / Set món" : "Tên món ăn"} <span className="text-rose-500">*</span>
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
                    placeholder={form.isCombo ? "Ví dụ: Combo 2 Người - Phở & Trà Đào Tiết Kiệm" : "Ví dụ: Phở bò đặc biệt"}
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

                {/* Giá món / Combo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      {form.isCombo ? "Giá bán Combo (VNĐ)" : "Giá món ăn (VNĐ)"} <span className="text-rose-500">*</span>
                    </span>
                    {Number(form.price) > 0 && (
                      <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 font-mono">
                        = {Number(form.price).toLocaleString("vi-VN")} ₫
                      </span>
                    )}
                  </label>

                  {/* Quick discount buttons for combo */}
                  {form.isCombo && calculatedOriginalPrice > 0 && (
                    <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Percent size={12} className="text-amber-500" />
                          Set nhanh mức giảm giá cho combo:
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Bấm chọn để tự tính giá
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[10, 15, 20, 25, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const discounted = Math.round((calculatedOriginalPrice * (1 - pct / 100)) / 1000) * 1000;
                              setForm((prev) => ({ ...prev, price: String(discounted) }));
                              if (formErrors.price) setFormErrors((err) => ({ ...err, price: undefined }));
                            }}
                            className="px-2.5 py-1 rounded-xl border border-amber-300/80 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 text-xs font-black text-amber-700 dark:text-amber-300 shadow-2xs transition active:scale-95"
                          >
                            -{pct}%
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const discountAmount = calculatedOriginalPrice >= 120000 ? 20000 : 10000;
                            const discounted = Math.max(1000, calculatedOriginalPrice - discountAmount);
                            setForm((prev) => ({ ...prev, price: String(discounted) }));
                            if (formErrors.price) setFormErrors((err) => ({ ...err, price: undefined }));
                          }}
                          className="px-2.5 py-1 rounded-xl border border-emerald-300/80 dark:border-emerald-700 bg-white dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 text-xs font-black text-emerald-700 dark:text-emerald-300 shadow-2xs transition active:scale-95"
                        >
                          -{calculatedOriginalPrice >= 120000 ? "20.000₫" : "10.000₫"}
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={form.price}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, price: e.target.value }));
                      if (formErrors.price) setFormErrors((err) => ({ ...err, price: undefined }));
                    }}
                    placeholder={form.isCombo ? (calculatedOriginalPrice > 0 ? String(Math.round(calculatedOriginalPrice * 0.85)) : "120000") : "45000"}
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

                  {/* Combo Savings Preview */}
                  {comboSavings && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                      <Sparkles size={14} className="animate-pulse" />
                      <span>
                        Khách tiết kiệm: {comboSavings.diff.toLocaleString("vi-VN")} ₫ (-{comboSavings.pct}%) so với mua lẻ
                      </span>
                    </div>
                  )}

                  {/* Promo voucher note */}
                  <div className="flex items-start gap-2 rounded-xl border border-cyan-200/80 dark:border-cyan-800/40 bg-cyan-50/60 dark:bg-cyan-950/20 p-2.5 text-[11px] font-medium text-cyan-900 dark:text-cyan-300">
                    <Tag size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Mã giảm giá Voucher:</strong> Quán muốn phát hành mã giảm giá (nhập mã lúc đặt đơn) hãy dùng mục <strong className="font-bold">"Chiến dịch khuyến mãi" (icon PROMO ở menu trái)</strong>.
                    </span>
                  </div>
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

                {/* Item Type Filter (All / Single / Combo) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("all")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      itemTypeFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("single")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      itemTypeFilter === "single"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Món đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter("combo")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      itemTypeFilter === "combo"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    🍱 Combo ({stats.combos})
                  </button>
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
                  {searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all" || itemTypeFilter !== "all"
                    ? "Không tìm thấy món ăn phù hợp"
                    : "Chưa có món ăn nào"}
                </h3>
                <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
                  {searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all" || itemTypeFilter !== "all"
                    ? "Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm tên khác."
                    : "Bắt đầu thêm các món ăn hoặc combo hấp dẫn vào thực đơn Merchant ngay bên trên."}
                </p>

                {(searchQuery || selectedCategoryFilter !== "all" || statusFilter !== "all" || itemTypeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryFilter("all");
                      setStatusFilter("all");
                      setItemTypeFilter("all");
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

                  return (
                    <div
                      key={food.id}
                      className={`group relative flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        food.isCombo
                          ? isAvail
                            ? "border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-white via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/10"
                            : "border-amber-300/40 bg-amber-50/20 dark:bg-amber-950/10 opacity-80"
                          : isAvail
                          ? "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90"
                          : "border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 opacity-80"
                      }`}
                    >
                      <div>
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative">
                            <ImageWithFallback
                              src={food.imageUrl}
                              alt={food.name}
                            />
                            {food.isCombo && (
                              <span className="absolute top-1.5 left-1.5 rounded-lg bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-black shadow-xs">
                                COMBO
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {/* Combo Badge Row */}
                            {food.isCombo && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  🍱 Combo
                                </span>
                                {food.servingSize && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                                    <Users size={10} /> {food.servingSize}
                                  </span>
                                )}
                                {food.originalPrice && Number(food.originalPrice) > Number(food.price) && (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 dark:bg-rose-400/10 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                                    -{Math.round(((Number(food.originalPrice) - Number(food.price)) / Number(food.originalPrice)) * 100)}%
                                  </span>
                                )}
                              </div>
                            )}

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

                            {/* Combo Items Pill list */}
                            {food.isCombo && food.comboItems && food.comboItems.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {food.comboItems.map((ci) => (
                                  <span
                                    key={ci.id || ci.foodId}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                                  >
                                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">{ci.quantity}x</span>
                                    <span className="truncate max-w-[110px]">{ci.food?.name ?? "Món"}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Price & Status Toggle */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
                                  {Number(food.price).toLocaleString("vi-VN")} ₫
                                </span>
                                {food.originalPrice && Number(food.originalPrice) > Number(food.price) && (
                                  <span className="text-xs font-bold text-slate-400 line-through font-mono">
                                    {Number(food.originalPrice).toLocaleString("vi-VN")} ₫
                                  </span>
                                )}
                              </div>

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
    </main>
  );
}
