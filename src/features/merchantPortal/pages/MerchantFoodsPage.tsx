import { useEffect, useState } from "react";
import { ChevronLeft, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { useNavigate } from "react-router";

export function MerchantFoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<string | null>(null);
  const [deletingFoodId, setDeletingFoodId] = useState<string | null>(null);
  const [uploadingFoodImage, setUploadingFoodImage] = useState(false);
  const [foodImageFileName, setFoodImageFileName] = useState("");
  const [foodImagePreview, setFoodImagePreview] = useState("");
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [toppingsByFoodId, setToppingsByFoodId] = useState<
    Record<string, FoodTopping[]>
  >({});
  const [toppingForms, setToppingForms] = useState<
    Record<string, { name: string; price: number }>
  >({});
  const [loadingToppingsByFoodId, setLoadingToppingsByFoodId] = useState<
    Record<string, boolean>
  >({});
  const [savingToppingByFoodId, setSavingToppingByFoodId] = useState<
    Record<string, boolean>
  >({});
  const [deletingToppingId, setDeletingToppingId] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    imageUrl: "",
    categoryIds: [] as string[],
  });

  async function loadData() {
    setLoading(true);

    try {
      const [foodData, categoryData] = await Promise.all([
        getFoods(),
        getCategories(),
      ]);

      setFoods(foodData);
      setCategories(categoryData);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được dữ liệu món ăn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  async function handleFoodImageUpload(file?: File) {
    if (!file) return;

    setUploadingFoodImage(true);
    setFoodImageFileName(file.name);

    try {
      validateImageFile(file);

      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(file);
      });

      setFoodImagePreview(preview);

      const imageUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl }));
      setFoodImagePreview(imageUrl);
      notify.success("Tải ảnh món thành công.");
    } catch (error) {
      console.error(error);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
      setFoodImagePreview("");
      setFoodImageFileName("");
      notify.error(
        error instanceof Error
          ? error.message
          : "Tải ảnh thất bại. Vui lòng thử lại.",
      );
    } finally {
      setUploadingFoodImage(false);
    }
  }

  function clearFoodImage() {
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    setFoodImagePreview("");
    setFoodImageFileName("");
  }

  async function handleCreateFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      notify.error("Vui lòng nhập tên món.");
      return;
    }

    if (uploadingFoodImage) {
      notify.error("Vui lòng đợi ảnh tải lên xong.");
      return;
    }

    setCreating(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        imageUrl: form.imageUrl.trim(),
        isAvailable: true,
        categoryIds: form.categoryIds,
      };

      if (editingFoodId) {
        await updateFood(editingFoodId, payload);
      } else {
        await createFood(payload);
      }

      notify.success(editingFoodId ? "Cập nhật món thành công." : "Tạo món thành công.");

      setForm({
        name: "",
        description: "",
        price: 0,
        imageUrl: "",
        categoryIds: [],
      });
      setFoodImagePreview("");
      setFoodImageFileName("");
      setEditingFoodId(null);

      await loadData();
    } catch (error) {
      console.error(error);
      notify.error("Tạo món thất bại.");
    } finally {
      setCreating(false);
    }
  }

  function startEditingFood(food: Food) {
    setEditingFoodId(food.id);
    setForm({
      name: food.name,
      description: food.description ?? "",
      price: food.price,
      imageUrl: food.imageUrl ?? "",
      categoryIds: food.categoryIds ?? [],
    });
    setFoodImagePreview(food.imageUrl ?? "");
    setFoodImageFileName("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAvailabilityChange(food: Food) {
    setUpdatingAvailabilityId(food.id);
    try {
      await updateFoodAvailability(food.id, !(food.isAvailable ?? true));
      await loadData();
    } catch (error) {
      console.error(error);
      notify.error("Không thể cập nhật trạng thái món.");
    } finally {
      setUpdatingAvailabilityId(null);
    }
  }

  async function handleDeleteFood(foodId: string) {
    setDeletingFoodId(foodId);

    try {
      await deleteFood(foodId);
      notify.success("Đã xóa món.");
      await loadData();
    } catch (error) {
      console.error(error);
      notify.error("Xóa món thất bại.");
    } finally {
      setDeletingFoodId(null);
    }
  }

  async function loadToppings(foodId: string) {
    setLoadingToppingsByFoodId((prev) => ({ ...prev, [foodId]: true }));

    try {
      const toppings = await getFoodToppings(foodId);
      setToppingsByFoodId((prev) => ({ ...prev, [foodId]: toppings }));
    } catch (error) {
      console.error(error);
      notify.error("Không tải được danh sách topping.");
    } finally {
      setLoadingToppingsByFoodId((prev) => ({ ...prev, [foodId]: false }));
    }
  }

  function toggleToppings(foodId: string) {
    setExpandedFoodId((prev) => {
      const next = prev === foodId ? null : foodId;
      if (next && !toppingsByFoodId[next]) {
        void loadToppings(next);
      }
      return next;
    });
  }

  async function handleCreateTopping(foodId: string) {
    const currentForm = toppingForms[foodId] ?? { name: "", price: 0 };
    const name = currentForm.name.trim();
    const price = Number(currentForm.price);

    if (!name) {
      notify.error("Vui lòng nhập tên topping.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      notify.error("Giá topping không hợp lệ.");
      return;
    }

    setSavingToppingByFoodId((prev) => ({ ...prev, [foodId]: true }));

    try {
      await createFoodTopping({ foodId, name, price });
      notify.success("Đã thêm topping.");
      setToppingForms((prev) => ({
        ...prev,
        [foodId]: { name: "", price: 0 },
      }));
      await loadToppings(foodId);
    } catch (error) {
      console.error(error);
      notify.error("Thêm topping thất bại.");
    } finally {
      setSavingToppingByFoodId((prev) => ({ ...prev, [foodId]: false }));
    }
  }

  async function handleDeleteTopping(foodId: string, toppingId?: string) {
    if (!toppingId) return;

    setDeletingToppingId(toppingId);

    try {
      await deleteFoodTopping(toppingId);
      notify.success("Đã xóa topping.");
      await loadToppings(foodId);
    } catch (error) {
      console.error(error);
      notify.error("Xóa topping thất bại.");
    } finally {
      setDeletingToppingId(null);
    }
  }

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/60 bg-white/75 px-3.5 text-[13px] font-black text-cyan-800 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md active:translate-y-0"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
              Quay lại
            </button>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
              Food Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
              Quản lý món ăn
            </h1>
            <p className="mt-3 text-[14px] font-medium text-slate-500 leading-relaxed">
              Tạo, xem và xóa món ăn của merchant hiện tại.
            </p>
          </div>

          <form
            onSubmit={handleCreateFood}
            className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl mix-blend-multiply" />
            <h2 className="mb-6 text-[18px] font-black tracking-tight text-slate-900 relative">
              {editingFoodId ? "Cập nhật món" : "Thêm món mới"}
            </h2>

            <div className="grid gap-5 md:grid-cols-2 relative">
              <label className="space-y-1.5">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Tên món <span className="text-rose-500">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Bún bò Huế"
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Giá <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  placeholder="45000"
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Mô tả
                </span>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Đậm vị Huế"
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                />
              </label>

              <div className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Ảnh món ăn
                </span>

                <div className="rounded-2xl border border-dashed border-cyan-200/80 bg-white/60 p-4 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-cyan-50 text-cyan-700 shadow-sm">
                      {foodImagePreview ? (
                        <img
                          src={foodImagePreview}
                          alt="Ảnh món đang chọn"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="h-8 w-8" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Chọn ảnh từ máy để tải lên
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Hỗ trợ JPG, PNG, GIF hoặc WebP nhỏ hơn 5MB. FE sẽ upload
                        ảnh và tự gắn URL vào món.
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          id="food-image-upload"
                          type="file"
                          accept={IMAGE_UPLOAD_ACCEPT}
                          className="sr-only"
                          onChange={(event) => {
                            void handleFoodImageUpload(event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                        <label
                          htmlFor="food-image-upload"
                          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700"
                        >
                          {uploadingFoodImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="h-4 w-4" />
                          )}
                          {uploadingFoodImage ? "Đang tải ảnh..." : "Chọn ảnh"}
                        </label>

                        {foodImagePreview ? (
                          <button
                            type="button"
                            onClick={clearFoodImage}
                            disabled={uploadingFoodImage}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            Xóa ảnh
                          </button>
                        ) : null}
                      </div>

                      <p className="mt-2 truncate text-xs font-semibold text-slate-500">
                        {foodImageFileName || "Chưa chọn ảnh"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">
                  Danh mục
                </span>
                <select
                  multiple
                  value={form.categoryIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(
                      (option) => option.value,
                    );

                    setForm((prev) => ({ ...prev, categoryIds: selected }));
                  }}
                  className="min-h-32 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[14px] font-medium outline-none shadow-sm backdrop-blur transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      className="py-1"
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={creating || uploadingFoodImage}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating || uploadingFoodImage ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              {uploadingFoodImage
                ? "Đang tải ảnh..."
                : creating
                  ? "Đang tạo..."
                   : editingFoodId
                     ? "Lưu thay đổi"
                     : "Thêm món"}
            </button>
          </form>

          <div className="mt-8 relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl mix-blend-multiply" />
            <h2 className="mb-6 text-[18px] font-black tracking-tight text-slate-900 relative">
              Danh sách món
            </h2>

            {loading && (
              <p className="text-slate-500 font-medium">Đang tải...</p>
            )}

            {!loading && foods.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-12 text-center shadow-sm backdrop-blur">
                <p className="text-[15px] font-bold text-slate-500">
                  Chưa có món nào.
                </p>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 relative">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="group rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-white/80"
                >
                  <div className="flex gap-4">
                    {food.imageUrl && (
                      <img
                        src={food.imageUrl}
                        alt={food.name}
                        className="h-24 w-24 rounded-2xl object-cover shadow-sm"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[16px] font-black text-slate-900 group-hover:text-cyan-800 transition-colors truncate">
                          {food.name}
                        </h3>
                        <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingFood(food)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/60 bg-white/70 text-cyan-700 shadow-sm transition-all hover:bg-cyan-50"
                          aria-label="Sửa món"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFood(food.id)}
                          disabled={deletingFoodId === food.id}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200/60 bg-white/70 text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md disabled:opacity-50"
                          aria-label="Xóa món"
                        >
                          <Trash2 size={16} />
                        </button>
                        </div>
                      </div>

                      {food.description && (
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-medium text-slate-500">
                          {food.description}
                        </p>
                      )}

                      <p className="mt-2.5 text-[16px] font-black text-cyan-700">
                        {food.price.toLocaleString("vi-VN")}đ
                      </p>

                      {typeof food.isAvailable === "boolean" && (
                        <button
                          type="button"
                          disabled={updatingAvailabilityId === food.id}
                          onClick={() => void handleAvailabilityChange(food)}
                          className="mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm border border-slate-200/60 bg-white disabled:opacity-50"
                        >
                          {food.isAvailable ? (
                            <span className="text-emerald-600">Đang bán</span>
                          ) : (
                            <span className="text-amber-600">Tạm ẩn</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200/50 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleToppings(food.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/60 bg-white/70 px-4 py-2 text-[13px] font-black text-cyan-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-md"
                    >
                      Topping & Đồ thêm
                      <span className="text-[11px] font-bold text-cyan-700/60 ml-1">
                        {expandedFoodId === food.id ? "Ẩn" : "Mở"}
                      </span>
                    </button>

                    {expandedFoodId === food.id && (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl border border-white/60 bg-white/50 p-4 shadow-sm">
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="space-y-1.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                Tên topping
                              </span>
                              <input
                                value={toppingForms[food.id]?.name ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setToppingForms((prev) => ({
                                    ...prev,
                                    [food.id]: {
                                      name: value,
                                      price: prev[food.id]?.price ?? 0,
                                    },
                                  }));
                                }}
                                placeholder="Thêm đồ ăn kèm"
                                className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-[13px] font-medium outline-none shadow-sm transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                              />
                            </label>

                            <label className="space-y-1.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                Giá thêm
                              </span>
                              <input
                                type="number"
                                value={toppingForms[food.id]?.price ?? 0}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setToppingForms((prev) => ({
                                    ...prev,
                                    [food.id]: {
                                      name: prev[food.id]?.name ?? "",
                                      price: Number.isFinite(value) ? value : 0,
                                    },
                                  }));
                                }}
                                placeholder="5000"
                                className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-[13px] font-medium outline-none shadow-sm transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
                              />
                            </label>

                            <div className="flex items-end pb-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCreateTopping(food.id)
                                }
                                disabled={savingToppingByFoodId[food.id]}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-cyan-900/20 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60"
                              >
                                <Plus size={16} />
                                {savingToppingByFoodId[food.id]
                                  ? "Đang thêm..."
                                  : "Thêm topping"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {loadingToppingsByFoodId[food.id] && (
                          <p className="text-[13px] font-medium text-slate-500">
                            Đang tải topping...
                          </p>
                        )}

                        {!loadingToppingsByFoodId[food.id] &&
                          (toppingsByFoodId[food.id]?.length ?? 0) === 0 && (
                            <p className="text-[13px] font-medium text-slate-500">
                              Chưa có topping nào.
                            </p>
                          )}

                        <div className="space-y-2.5">
                          {(toppingsByFoodId[food.id] ?? []).map((topping) => (
                            <div
                              key={topping.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3 shadow-sm transition-all hover:bg-white/70"
                            >
                              <div>
                                <p className="text-[14px] font-bold text-slate-900">
                                  {topping.name}
                                </p>
                                <p className="text-[13px] font-black text-cyan-700 mt-0.5">
                                  {Number(topping.price ?? 0).toLocaleString(
                                    "vi-VN",
                                  )}
                                  đ
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteTopping(food.id, topping.id)
                                }
                                disabled={deletingToppingId === topping.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/60 bg-white/70 text-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
                                aria-label="Xóa topping"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
