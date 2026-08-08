import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Flame,
  Search,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";

import {
  getReviewsByMerchantId,
  type Review,
} from "@/features/review/services";

import {
  getMerchantDetail,
  incrementMerchantView,
} from "../services/merchantService";

import type {
  MerchantDetail,
  MerchantFoodTopping,
  MerchantMenuItem,
} from "../types";

import { getWishlist } from "../services/wishlistService";
import { createOrder } from "../services/orderService";
import { notify } from "@/shared/lib/notify";
import { clearAuth, getCurrentUser } from "@/features/auth";
import { ModeToggle } from "@/shared/components";
import { WishlistButton } from "../components/WishlistButton";
import { FoodCard } from "../components/FoodCard";
import { FoodOptionModal } from "../components/FoodOptionModal";
import { CartDrawer, type CartItem } from "../components/CartDrawer";



const DESCRIPTION_META_LABELS = [
  "Địa chỉ",
  "Loại hình quán",
  "Loại món chính",
  "Khoảng giá trung bình",
];

const viewedMerchantIds = new Set<string>();

async function trackMerchantViewOnce(merchantId: string) {
  if (viewedMerchantIds.has(merchantId)) return;

  viewedMerchantIds.add(merchantId);

  try {
    await incrementMerchantView(merchantId);
  } catch (error) {
    viewedMerchantIds.delete(merchantId);
    console.error(error);
  }
}

function getReviewContent(review: Review) {
  return review.content || "";
}

function getReviewAuthorName(review: Review) {
  return review.customerName || "Khách hàng UGem";
}

function getReviewAuthorAvatarUrl(review: Review) {
  return review.customerAvatarUrl || "";
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "UG"
  );
}

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function buildOrderItemNotes(
  notes: string | undefined,
  toppings: MerchantFoodTopping[] | undefined,
) {
  const cleanedNotes = (notes ?? "").trim();
  const toppingNames = (toppings ?? [])
    .map((topping) => topping.name?.trim())
    .filter(Boolean);

  if (toppingNames.length === 0) {
    return cleanedNotes;
  }

  const toppingNote = `Topping: ${toppingNames.join(", ")}`;
  return [cleanedNotes, toppingNote].filter(Boolean).join(" | ");
}

function parseMerchantDescription(description?: string) {
  const lines = (description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const markerIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("thông tin ui bổ sung"),
  );

  const isMetaLine = (line: string) =>
    DESCRIPTION_META_LABELS.some((label) =>
      line.toLowerCase().startsWith(`${label.toLowerCase()}:`),
    );

  const isUiMarkerLine = (line: string) =>
    line.toLowerCase().includes("thông tin ui bổ sung");

  const summaryLines =
    markerIndex >= 0
      ? lines.slice(0, markerIndex)
      : lines.filter((line) => !isMetaLine(line) && !isUiMarkerLine(line));

  const metaLines =
    markerIndex >= 0
      ? lines.slice(markerIndex + 1)
      : lines.filter((line) => isMetaLine(line));

  const facts = metaLines
    .map((line) => {
      const [label, ...valueParts] = line.split(":");
      return {
        label: label.trim(),
        value: valueParts.join(":").trim(),
      };
    })
    .filter((item) => item.label && item.value);

  return {
    summary: summaryLines.join("\n").trim(),
    facts,
  };
}

function formatRating(value: number) {
  return value.toFixed(2);
}

function getCartQuantity(cart: CartItem[], foodId: string) {
  return cart.find((item) => item.food.id === foodId)?.quantity ?? 0;
}

const AFFILIATE_REF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getAffiliateRefStorageKey(merchantId: string) {
  return `ugem_affiliate_ref_${merchantId}`;
}

function storeAffiliateRef(merchantId: string, linkCode: string) {
  if (!merchantId || !linkCode) return;

  window.localStorage.setItem(
    getAffiliateRefStorageKey(merchantId),
    JSON.stringify({
      linkCode,
      expiresAt: Date.now() + AFFILIATE_REF_TTL_MS,
    }),
  );
}

function getStoredAffiliateRef(merchantId: string) {
  try {
    const raw = window.localStorage.getItem(
      getAffiliateRefStorageKey(merchantId),
    );
    if (!raw) return undefined;

    const data = JSON.parse(raw) as {
      linkCode?: string;
      expiresAt?: number;
    };

    if (!data.linkCode || !data.expiresAt || data.expiresAt <= Date.now()) {
      window.localStorage.removeItem(getAffiliateRefStorageKey(merchantId));
      return undefined;
    }

    return data.linkCode;
  } catch {
    window.localStorage.removeItem(getAffiliateRefStorageKey(merchantId));
    return undefined;
  }
}

export default function MerchantDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();
  const handleBack = useSafeBack("/customer");
  const currentUser = getCurrentUser();
  const isOfflineOrder = searchParams.get("mode") === "offline";
  const affiliateRef = searchParams.get("ref")?.trim() || undefined;

  const reviewSectionRef = useRef<HTMLElement | null>(null);

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingFood, setPendingFood] = useState<MerchantMenuItem | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [pendingNotes, setPendingNotes] = useState("");
  const [pendingToppingIds, setPendingToppingIds] = useState<string[]>([]);
  const [pendingMode, setPendingMode] = useState<"add" | "edit">("add");

  const [foodSearchKeyword, setFoodSearchKeyword] = useState("");
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("");

  const [showReviews, setShowReviews] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);


  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      const toppingTotal = (item.toppings ?? []).reduce(
        (subtotal, topping) => subtotal + (topping.price || 0),
        0,
      );
      return sum + (item.food.price + toppingTotal) * item.quantity;
    }, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const menuItems = useMemo(
    () => merchant?.menu || merchant?.foods || [],
    [merchant],
  );

  const foodCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    menuItems.forEach((item) => {
      item.categoryDetail?.forEach((cat) => categoriesSet.add(cat));
    });
    return Array.from(categoriesSet);
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((food) => {
      const matchesKeyword =
        !foodSearchKeyword.trim() ||
        food.name.toLowerCase().includes(foodSearchKeyword.trim().toLowerCase()) ||
        (food.description ?? "").toLowerCase().includes(foodSearchKeyword.trim().toLowerCase());

      const matchesCategory =
        !selectedFoodCategory ||
        food.categoryDetail?.includes(selectedFoodCategory);

      return matchesKeyword && matchesCategory;
    });
  }, [menuItems, foodSearchKeyword, selectedFoodCategory]);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);

      try {
        const [merchantData, reviewData] = await Promise.all([
          getMerchantDetail(id!),
          getReviewsByMerchantId(id!),
        ]);

        setMerchant(merchantData);
        setReviews(reviewData);
        void trackMerchantViewOnce(id!);
      } catch (error) {
        console.error(error);
        notify.error("Không tải được chi tiết quán.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  useEffect(() => {
    if (!id || !currentUser) return;
    getWishlist()
      .then((items) => {
        const exists = items.some(
          (item) => (item.merchantId || item.id) === id,
        );
        setIsWishlisted(exists);
      })
      .catch(() => undefined);
  }, [id, currentUser]);

  useEffect(() => {
    if (!isOfflineOrder) return;

    const timeoutId = window.setTimeout(() => {
      setCart([]);
      setCartOpen(false);
      closeAddFoodModal();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOfflineOrder]);

  useEffect(() => {
    if (!affiliateRef || !currentUser || currentUser.Role === "Customer") {
      return;
    }

    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    clearAuth();
    notify.error(
      "Vui lòng đăng nhập bằng tài khoản Customer khác để đặt món qua link affiliate.",
    );
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, {
      replace: true,
    });
  }, [affiliateRef, currentUser, navigate]);

  useEffect(() => {
    if (!id || !affiliateRef || currentUser?.Role !== "Customer") return;

    storeAffiliateRef(id, affiliateRef);
  }, [affiliateRef, currentUser?.Role, id]);

  async function handleCreateOrder() {
    if (!merchant?.id || cart.length === 0) return;

    if (isOfflineOrder) {
      notify.error(
        "Đơn tại quán sẽ do merchant tạo. Khi tính tiền, bạn quét QR để check-in.",
      );
      return;
    }

    if (affiliateRef && currentUser?.Role !== "Customer") {
      notify.error(
        "Vui lòng đăng nhập bằng tài khoản Customer khác để đặt món qua link affiliate.",
      );
      return;
    }

    setOrdering(true);

    try {
      await createOrder({
        name: `Order from ${merchant.name || "Unnamed merchant"}`,
        deliveryAddress: merchant.address || "No address",
        orderType: "Online",
        paymentMethod: "COD",
        notes: "",
        finalPrice: total,
        affiliateLinkCode: affiliateRef || getStoredAffiliateRef(merchant.id),
        foods: cart.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          notes:
            buildOrderItemNotes(item.notes ?? "", item.toppings) || undefined,
          foodToppingIds: item.toppings?.map((topping) => topping.id),
        })),
      });

      notify.success("Đặt món giao hàng thành công.");

      setCart([]);
      setCartOpen(false);
      navigate("/customer/orders");
    } catch (error) {
      console.error(error);
      notify.error("Đặt món thất bại.");
    } finally {
      setOrdering(false);
    }
  }

  function addToCart(
    food: MerchantMenuItem,
    quantity: number = 1,
    notes: string = "",
    toppings: MerchantFoodTopping[] = [],
  ) {
    const nextQuantity = Math.max(1, Math.min(99, Math.floor(quantity || 1)));

    setCart((prev) => {
      const existed = prev.find((item) => item.food.id === food.id);

      if (existed) {
        return prev.map((item) =>
          item.food.id === food.id
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + nextQuantity),
                notes,
                toppings,
              }
            : item,
        );
      }

      return [
        ...prev,
        { food, quantity: nextQuantity, notes: notes.trim(), toppings },
      ];
    });
  }

  function updateCartItem(
    foodId: string,
    quantity: number,
    notes: string,
    toppings: MerchantFoodTopping[],
  ) {
    setCart((prev) =>
      prev.map((item) =>
        item.food.id === foodId
          ? {
              ...item,
              quantity: Math.max(1, Math.min(99, Math.floor(quantity || 1))),
              notes: notes.trim(),
              toppings,
            }
          : item,
      ),
    );
  }

  function incrementCartItem(foodId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.food.id === foodId
          ? { ...item, quantity: Math.min(99, item.quantity + 1) }
          : item,
      ),
    );
  }

  function decrementCartItem(foodId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.food.id === foodId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setCartOpen(false);
  }

  useEffect(() => {
    if (!showReviews) return;

    reviewSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [showReviews]);

  function openAddFoodModal(food: MerchantMenuItem) {
    setPendingFood(food);
    setPendingQuantity(1);
    setPendingNotes("");
    setPendingToppingIds([]);
    setPendingMode("add");
  }

  function closeAddFoodModal() {
    setPendingFood(null);
    setPendingQuantity(1);
    setPendingNotes("");
    setPendingToppingIds([]);
    setPendingMode("add");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800 shadow-xl" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800 shadow-lg"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center transition-colors duration-300">
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-10 shadow-2xl">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">
            Không tìm thấy quán
          </h2>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Merchant này có thể đã bị xoá hoặc không tồn tại.
          </p>

          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const name = merchant.name || "Unnamed merchant";
  const descriptionInfo = parseMerchantDescription(merchant.description);
  const visibleFacts = descriptionInfo.facts.filter(
    (item) => item.label.toLowerCase() !== "địa chỉ",
  );
  const reviewCount = reviews.length;
  const reviewAverage =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
        reviewCount
      : null;
  const displayRating =
    reviewAverage && reviewAverage > 0
      ? reviewAverage
      : typeof merchant.rating === "number" && merchant.rating > 0
        ? merchant.rating
        : null;

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-950 dark:text-slate-100 transition-colors duration-300 px-4 pt-6 ${
        cart.length > 0 ? "pb-28" : "pb-12"
      }`}
    >
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 dark:bg-amber-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Top Header Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <ModeToggle />
        </div>

        {/* Merchant Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 text-white shadow-2xl p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.25),transparent_50%)] pointer-events-none" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-300 backdrop-blur-md shadow-2xs">
                <Flame className="h-3.5 w-3.5 text-cyan-400" /> Premium Merchant
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl leading-tight text-white">
                {name}
              </h1>

              {merchant.address && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-cyan-400" />
                  {merchant.address}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReviews(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-300 backdrop-blur-md transition hover:bg-amber-400/20"
                >
                  <Star
                    className={
                      displayRating
                        ? "h-4 w-4 fill-amber-400 text-amber-400"
                        : "h-4 w-4 text-amber-400/50"
                    }
                  />
                  {displayRating
                    ? `Đánh giá ${formatRating(displayRating)} ★${reviewCount > 0 ? ` (${reviewCount} đánh giá)` : ""}`
                    : "Chưa có đánh giá"}
                </button>

                {merchant.phone && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md">
                    <Phone className="h-4 w-4 text-cyan-400" />
                    {merchant.phone}
                  </span>
                )}

                {merchant.email && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md">
                    <Mail className="h-4 w-4 text-cyan-400" />
                    {merchant.email}
                  </span>
                )}
              </div>

              {descriptionInfo.summary && (
                <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-300 font-medium">
                  {descriptionInfo.summary}
                </p>
              )}

              {visibleFacts.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {visibleFacts.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1 text-xs font-bold text-cyan-200"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-start justify-end gap-3">
              <WishlistButton
                merchantId={merchant.id}
                initialSaved={isWishlisted}
                variant="full"
                size="lg"
                onToggleSuccess={(nextSaved) => setIsWishlisted(nextSaved)}
              />
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Recommended Menu
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Thực đơn món ăn
              </h2>
            </div>

            {/* Food Search & Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={foodSearchKeyword}
                  onChange={(e) => setFoodSearchKeyword(e.target.value)}
                  placeholder="Tìm món trong thực đơn..."
                  className="h-10 w-full sm:w-64 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 pl-10 pr-4 text-xs font-bold text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {foodCategories.length > 0 && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedFoodCategory("")}
                className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition ${
                  !selectedFoodCategory
                    ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                    : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400"
                }`}
              >
                Tất cả ({menuItems.length})
              </button>
              {foodCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFoodCategory(cat)}
                  className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition ${
                    selectedFoodCategory === cat
                      ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                      : "border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isOfflineOrder && (
            <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-sm font-bold text-amber-900 dark:text-amber-300 shadow-2xs">
              Đang ở chế độ xem menu tại quán. Gọi món trực tiếp với nhân viên hoặc qua QR bàn.
            </div>
          )}

          {filteredMenuItems.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {filteredMenuItems.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  cartQuantity={getCartQuantity(cart, food.id)}
                  isOfflineOrder={isOfflineOrder}
                  onOpenModal={openAddFoodModal}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 p-10 text-center shadow-2xs">
              <Flame className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                Không tìm thấy món ăn
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Thử thay đổi từ khóa tìm kiếm món ăn hoặc chọn danh mục khác.
              </p>
            </div>
          )}
        </section>

        {/* Reviews Section */}
        {showReviews && (
          <section
            ref={reviewSectionRef}
            id="review-section"
            className="mt-10 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs"
          >
            <div className="mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Customer Reviews
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Đánh giá từ khách hàng
              </h2>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div
                    key={review.reviewId || `${review.createdAt}-${index}`}
                    className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 p-5"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 dark:bg-cyan-950 text-xs font-black text-cyan-800 dark:text-cyan-300">
                        {getReviewAuthorAvatarUrl(review) ? (
                          <img
                            src={getReviewAuthorAvatarUrl(review)}
                            alt={getReviewAuthorName(review)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(getReviewAuthorName(review))
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                          {getReviewAuthorName(review)}
                        </p>
                        {review.createdAt ? (
                          <p className="text-xs font-semibold text-slate-400">
                            {new Date(review.createdAt).toLocaleString("vi-VN")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {review.rating && review.rating > 0 ? (
                      <div className="mb-2 flex items-center gap-1 text-amber-500">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    ) : null}

                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {getReviewContent(review) || "Không có nội dung."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                Chưa có đánh giá nào cho quán này.
              </div>
            )}
          </section>
        )}

        {/* Modal Topping Options */}
        {pendingFood && (
          <FoodOptionModal
            food={pendingFood}
            quantity={pendingQuantity}
            notes={pendingNotes}
            toppingIds={pendingToppingIds}
            mode={pendingMode}
            onQuantityChange={setPendingQuantity}
            onNotesChange={setPendingNotes}
            onToppingToggle={(toppingId, checked) => {
              setPendingToppingIds((prev) =>
                checked
                  ? Array.from(new Set([...prev, toppingId]))
                  : prev.filter((id) => id !== toppingId),
              );
            }}
            onConfirm={() => {
              const selectedToppings = (pendingFood.toppings ?? []).filter((topping) =>
                pendingToppingIds.includes(topping.id),
              );
              if (pendingMode === "edit") {
                updateCartItem(pendingFood.id, pendingQuantity, pendingNotes, selectedToppings);
              } else {
                addToCart(pendingFood, pendingQuantity, pendingNotes, selectedToppings);
              }
              closeAddFoodModal();
            }}
            onClose={closeAddFoodModal}
          />
        )}

        {/* Cart Drawer */}
        <CartDrawer
          isOpen={cartOpen}
          cart={cart}
          total={total}
          cartItemCount={cartItemCount}
          ordering={ordering}
          onClose={() => setCartOpen(false)}
          onIncrement={incrementCartItem}
          onDecrement={decrementCartItem}
          onClearCart={clearCart}
          onCreateOrder={() => void handleCreateOrder()}
        />

        {/* Floating Bottom Cart Bar */}
        {cart.length > 0 && !cartOpen && (
          <div className="fixed inset-x-0 bottom-4 z-40 px-4">
            <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {cartItemCount} món đã chọn
                </span>
                <p className="text-xl font-black text-cyan-400 font-mono">
                  {formatPrice(total)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-white hover:bg-white/20 transition"
                >
                  Xem đơn
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateOrder()}
                  disabled={ordering}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50"
                >
                  {ordering ? "Đang đặt..." : "Đặt món"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
