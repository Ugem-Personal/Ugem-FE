import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Mail,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  Search,
  UserCheck,
  UserPlus,
  Utensils,
} from "lucide-react";

import { notify } from "@/shared/lib/notify";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import {
  searchCustomersByEmail,
  searchCustomersByPhoneNumber,
  type CustomerSearchResult,
} from "@/shared/services/customerService";
import {
  createMerchantOrder,
  type CreateMerchantOrderItem,
} from "@/shared/services/merchantOrderService";
import {
  getFoodToppings,
  type FoodTopping,
} from "@/shared/services/foodToppingService";
import { getFoods } from "../services/foodService";
import type { Food } from "../types";

type OfflineOrderItem = {
  foodId: string;
  quantity: number;
  notes: string;
  toppingIds: string[];
};

type CustomerSearchMode = "phone" | "email";

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatCurrency(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}đ`;
}

export default function MerchantCreateOrderPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [items, setItems] = useState<OfflineOrderItem[]>([]);
  const [searchMode, setSearchMode] = useState<CustomerSearchMode>("phone");
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [customerLookupStatus, setCustomerLookupStatus] = useState<
    "idle" | "found" | "not-found"
  >("idle");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const creatingOrderRef = useRef(false);
  const [toppingsByFoodId, setToppingsByFoodId] = useState<
    Record<string, FoodTopping[]>
  >({});

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      setLoading(true);

      try {
        const menu = await getFoods();
        if (!active) return;

        setFoods(menu);
        const toppingEntries = await Promise.all(
          menu.map(async (food) => {
            try {
              return [food.id, await getFoodToppings(food.id)] as const;
            } catch (error) {
              console.error(error);
              return [food.id, []] as const;
            }
          }),
        );

        if (active) {
          setToppingsByFoodId(Object.fromEntries(toppingEntries));
        }
      } catch (error) {
        console.error(error);
        notify.error("Không tải được menu để tạo đơn tại quán.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMenu();

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const food = foods.find((candidate) => candidate.id === item.foodId);
      const toppings = toppingsByFoodId[item.foodId] ?? [];
      const toppingTotal = item.toppingIds.reduce((toppingSum, toppingId) => {
        const topping = toppings.find(
          (candidate) => candidate.id === toppingId,
        );
        return toppingSum + Number(topping?.price ?? 0);
      }, 0);

      return sum + (Number(food?.price ?? 0) + toppingTotal) * item.quantity;
    }, 0);
  }, [foods, items, toppingsByFoodId]);

  const canOrder =
    customerLookupStatus === "found" && Boolean(selectedCustomer);
  const isPhoneMode = searchMode === "phone";

  async function loadToppingsForFood(foodId: string) {
    if (!foodId || toppingsByFoodId[foodId]) return;

    try {
      const toppings = await getFoodToppings(foodId);
      setToppingsByFoodId((current) => ({
        ...current,
        [foodId]: toppings,
      }));
    } catch (error) {
      console.error(error);
      setToppingsByFoodId((current) => ({
        ...current,
        [foodId]: [],
      }));
    }
  }

  function resetCreatedQr() {
    setCreatedOrderId(null);
  }

  function resetCustomerLookup() {
    resetCreatedQr();
    setItems([]);
    setSelectedCustomer(null);
    setCustomerLookupStatus("idle");
  }

  function changeSearchMode(mode: CustomerSearchMode) {
    setSearchMode(mode);
    setCustomerKeyword("");
    resetCustomerLookup();
  }

  async function handleSearchCustomer() {
    const keyword = customerKeyword.trim();

    resetCreatedQr();

    if (!keyword) {
      notify.error(
        isPhoneMode
          ? "Vui lòng nhập số điện thoại của khách."
          : "Vui lòng nhập Gmail của khách.",
      );
      setSelectedCustomer(null);
      setCustomerLookupStatus("idle");
      return;
    }

    setSearchingCustomer(true);

    try {
      const customers = isPhoneMode
        ? await searchCustomersByPhoneNumber(keyword, 10)
        : await searchCustomersByEmail(keyword, 10);

      const exactMatch =
        customers.find((customer) =>
          isPhoneMode
            ? normalizePhone(customer.phoneNumber) === normalizePhone(keyword)
            : customer.email.toLowerCase() === keyword.toLowerCase(),
        ) ?? null;

      if (!exactMatch) {
        setItems([]);
        setSelectedCustomer(null);
        setCustomerLookupStatus("not-found");
        notify.error(
          isPhoneMode
            ? "Không tìm thấy tài khoản khách với số điện thoại này."
            : "Không tìm thấy tài khoản khách với Gmail này.",
        );
        return;
      }

      setSelectedCustomer(exactMatch);
      setCustomerLookupStatus("found");
      notify.success("Đã xác minh tài khoản khách.");
    } catch (error) {
      console.error(error);
      setSelectedCustomer(null);
      setCustomerLookupStatus("idle");
      notify.error(
        isPhoneMode
          ? "Không thể tìm khách theo số điện thoại. Vui lòng thử lại."
          : "Không thể tìm khách theo Gmail. Vui lòng thử lại.",
      );
    } finally {
      setSearchingCustomer(false);
    }
  }

  function getSelectedItem(foodId: string) {
    return items.find((item) => item.foodId === foodId) ?? null;
  }

  function toggleFood(food: Food, checked: boolean) {
    if (!canOrder) {
      notify.error("Vui lòng xác minh khách trước khi chọn món.");
      return;
    }

    resetCreatedQr();

    setItems((current) => {
      if (!checked) {
        return current.filter((item) => item.foodId !== food.id);
      }

      if (current.some((item) => item.foodId === food.id)) {
        return current;
      }

      return [
        ...current,
        {
          foodId: food.id,
          quantity: 1,
          notes: "",
          toppingIds: [],
        },
      ];
    });

    if (checked) {
      void loadToppingsForFood(food.id);
    }
  }

  function updateFoodItem(foodId: string, patch: Partial<OfflineOrderItem>) {
    resetCreatedQr();
    setItems((current) =>
      current.map((item) =>
        item.foodId === foodId ? { ...item, ...patch } : item,
      ),
    );
  }

  function toggleTopping(foodId: string, toppingId: string, checked: boolean) {
    const selectedItem = getSelectedItem(foodId);
    if (!selectedItem) return;

    updateFoodItem(foodId, {
      toppingIds: checked
        ? Array.from(new Set([...selectedItem.toppingIds, toppingId]))
        : selectedItem.toppingIds.filter((id) => id !== toppingId),
    });
  }

  async function handleCreateOrder() {
    if (creatingOrderRef.current) {
      return;
    }

    const validItems = items.filter((item) => item.foodId && item.quantity > 0);

    if (!selectedCustomer) {
      notify.error("Vui lòng xác minh khách trước khi tạo đơn.");
      return;
    }

    if (validItems.length === 0) {
      notify.error("Vui lòng chọn ít nhất một món.");
      return;
    }

    const orderFoods: CreateMerchantOrderItem[] = validItems.map((item) => ({
      foodId: item.foodId,
      quantity: item.quantity,
      notes: item.notes || null,
      foodToppingIds: item.toppingIds,
    }));

    creatingOrderRef.current = true;
    setLoading(true);
    setCreatedOrderId(null);

    try {
      const createdOrder = await createMerchantOrder({
        customerId: selectedCustomer.customerId,
        name: selectedCustomer.fullName || selectedCustomer.email,
        deliveryAddress: "Tại quán",
        orderType: "Offline",
        paymentMethod: "Cash",
        notes: "Offline check-in",
        foods: orderFoods,
      });

      const orderId = createdOrder.data?.orderId;
      setCreatedOrderId(orderId ?? null);
      notify.success("Đã tạo đơn tại quán.");
    } catch (error) {
      console.error(error);
      notify.error("Tạo đơn tại quán thất bại.");
    } finally {
      creatingOrderRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_34%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_48%,#fff7ed_100%)] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <section className="relative flex min-h-screen">
        <MerchantSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MerchantHeader />

          <div className="mx-auto w-full max-w-6xl px-8 py-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Offline Order
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                Tạo đơn tại quán
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Chọn món chính trong menu, tích topping theo từng món và hệ
                thống tự tính tổng tiền.
              </p>
            </div>

            <div className="rounded-4xl border border-white/60 bg-white/75 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl">
              <div className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => changeSearchMode("phone")}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                      isPhoneMode
                        ? "bg-cyan-700 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Số điện thoại
                  </button>
                  <button
                    type="button"
                    onClick={() => changeSearchMode("email")}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                      !isPhoneMode
                        ? "bg-cyan-700 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Gmail
                  </button>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    {isPhoneMode
                      ? "Số điện thoại khách hàng"
                      : "Gmail khách hàng"}
                  </span>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      {isPhoneMode ? (
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      ) : (
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      )}
                      <input
                        value={customerKeyword}
                        onChange={(event) => {
                          setCustomerKeyword(event.target.value);
                          resetCustomerLookup();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSearchCustomer();
                          }
                        }}
                        placeholder={
                          isPhoneMode ? "0912345678" : "customer@gmail.com"
                        }
                        inputMode={isPhoneMode ? "tel" : "email"}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/15"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSearchCustomer()}
                      disabled={searchingCustomer}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Search className="h-4 w-4" />
                      {searchingCustomer ? "Đang tìm..." : "Kiểm tra"}
                    </button>
                  </div>
                </label>

                {customerLookupStatus === "found" && selectedCustomer ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-100">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {selectedCustomer.fullName}
                      </p>
                      <p className="truncate text-xs font-semibold text-emerald-700">
                        {selectedCustomer.phoneNumber || selectedCustomer.email}
                      </p>
                    </div>
                  </div>
                ) : null}

                {customerLookupStatus === "not-found" ? (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-amber-100">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">
                        Khách chưa có tài khoản UGem
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                        Hãy giới thiệu khách đăng ký hoặc đăng nhập ứng dụng
                        UGem bằng số điện thoại/Gmail để có thể đặt món tại quán
                        và nhận quyền lợi check-in.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="mt-5 block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Tên khách
                </span>
                <input
                  value={
                    selectedCustomer?.fullName ??
                    (customerLookupStatus === "not-found"
                      ? "Khách chưa có tài khoản UGem"
                      : "")
                  }
                  readOnly
                  placeholder="Xác minh khách để lấy tên khách"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 outline-none"
                />
              </label>

              {loading && foods.length === 0 ? (
                <p className="mt-5 text-sm font-semibold text-slate-500">
                  Đang tải menu...
                </p>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {foods.map((food) => {
                  const item = getSelectedItem(food.id);
                  const selected = Boolean(item);
                  const toppings = toppingsByFoodId[food.id] ?? [];
                  const selectedToppingTotal = (item?.toppingIds ?? []).reduce(
                    (sum, toppingId) => {
                      const topping = toppings.find(
                        (candidate) => candidate.id === toppingId,
                      );
                      return sum + Number(topping?.price ?? 0);
                    },
                    0,
                  );
                  const lineTotal =
                    (Number(food.price ?? 0) + selectedToppingTotal) *
                    Number(item?.quantity ?? 0);

                  return (
                    <article
                      key={food.id}
                      className={`rounded-2xl border p-4 shadow-sm transition ${
                        selected
                          ? "border-cyan-200 bg-cyan-50/70 ring-1 ring-cyan-100"
                          : "border-slate-100 bg-slate-50/80"
                      }`}
                    >
                      <div className="flex gap-4">
                        <label className="mt-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-cyan-200 bg-white text-cyan-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!canOrder}
                            onChange={(event) =>
                              toggleFood(food, event.target.checked)
                            }
                            className="sr-only"
                          />
                          {selected ? <Check className="h-4 w-4" /> : null}
                        </label>

                        {food.imageUrl ? (
                          <img
                            src={food.imageUrl}
                            alt={food.name}
                            className="h-20 w-20 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                            <Utensils className="h-6 w-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-black text-slate-950">
                                {food.name}
                              </h2>
                              {food.description ? (
                                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                                  {food.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-cyan-700">
                                {formatCurrency(food.price)}
                              </div>
                              {selected ? (
                                <div className="mt-1 text-xs font-bold text-slate-500">
                                  {formatCurrency(lineTotal)}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateFoodItem(food.id, {
                                    quantity: Math.max(
                                      1,
                                      Number(item?.quantity ?? 1) - 1,
                                    ),
                                  })
                                }
                                disabled={!selected}
                                className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                aria-label={`Giảm ${food.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                value={item?.quantity ?? 1}
                                onChange={(event) =>
                                  updateFoodItem(food.id, {
                                    quantity: Math.max(
                                      1,
                                      Number(event.target.value || 1),
                                    ),
                                  })
                                }
                                disabled={!selected}
                                className="h-10 w-14 border-x border-slate-200 text-center text-sm font-black text-slate-950 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                inputMode="numeric"
                                aria-label={`Số lượng ${food.name}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateFoodItem(food.id, {
                                    quantity: Math.min(
                                      99,
                                      Number(item?.quantity ?? 1) + 1,
                                    ),
                                  })
                                }
                                disabled={!selected}
                                className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                aria-label={`Tăng ${food.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {toppings.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {toppings.map((topping) => {
                            const toppingId = topping.id ?? "";
                            const checked = Boolean(
                              item?.toppingIds.includes(toppingId),
                            );

                            return (
                              <label
                                key={toppingId || topping.name}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                  checked
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                } ${selected ? "" : "cursor-not-allowed opacity-50"}`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  disabled={!selected}
                                  onChange={(event) =>
                                    toggleTopping(
                                      food.id,
                                      toppingId,
                                      event.target.checked,
                                    )
                                  }
                                />
                                {checked ? <Check className="h-3 w-3" /> : null}
                                +{topping.name} {formatCurrency(topping.price)}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}

                      <input
                        value={item?.notes ?? ""}
                        onChange={(event) =>
                          updateFoodItem(food.id, { notes: event.target.value })
                        }
                        disabled={!selected}
                        placeholder="Ghi chú món nếu có"
                        className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/15 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </article>
                  );
                })}
              </div>

              {foods.length === 0 && !loading ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-500">
                  Chưa có món nào trong menu.
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <div className="text-sm font-bold text-cyan-800">
                  Đã chọn {items.length} món
                </div>
                <div className="text-2xl font-black text-cyan-800">
                  Tổng: {formatCurrency(total)}
                </div>
              </div>

              {createdOrderId ? (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5 text-center">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-emerald-800">
                    <ReceiptText className="h-4 w-4" />
                    Order {createdOrderId}
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Đơn đã được tạo. Vào trang Đơn hàng để xác nhận và tạo QR.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleCreateOrder()}
                  disabled={
                    loading ||
                    !canOrder ||
                    foods.length === 0 ||
                    items.length === 0 ||
                    Boolean(createdOrderId)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ReceiptText className="h-4 w-4" />
                  {createdOrderId ? "Đã tạo đơn" : "Tạo đơn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
