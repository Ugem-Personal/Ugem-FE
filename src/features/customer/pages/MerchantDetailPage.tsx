import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Heart,
  Minus,
  ShoppingCart,
  Star,
  MapPin,
  Phone,
  Mail,
  Flame,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

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

import { addWishlist } from "../services/wishlistService";
import { createOrder } from "../services/orderService";
import { notify } from "@/shared/lib/notify";
import { clearAuth, getCurrentUser } from "@/features/auth";

type OnlinePaymentMethod = "COD" | "BankTransfer";

type CartItem = {
  food: MerchantMenuItem;
  quantity: number;
  notes?: string;
  toppings?: MerchantFoodTopping[];
};

const NOTE_PRESETS = ["Không hành", "Ít cay", "Không ớt", "Ít đường", "Ít mỡ"];

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
  const currentUser = getCurrentUser();
  const isOfflineOrder = searchParams.get("mode") === "offline";
  const affiliateRef = searchParams.get("ref")?.trim() || undefined;

  const reviewSectionRef = useRef<HTMLElement | null>(null);

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [pendingFood, setPendingFood] = useState<MerchantMenuItem | null>(null);

  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [pendingNotes, setPendingNotes] = useState("");
  const [pendingToppingIds, setPendingToppingIds] = useState<string[]>([]);
  const [pendingMode, setPendingMode] = useState<"add" | "edit">("add");

  const [showReviews, setShowReviews] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [ordering, setOrdering] = useState(false);
  const [onlinePaymentMethod, setOnlinePaymentMethod] =
    useState<OnlinePaymentMethod>("COD");

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
        paymentMethod: onlinePaymentMethod,
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

  function updateCartQuantity(foodId: string, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(99, Math.floor(quantity || 1)));

    setCart((prev) =>
      prev.map((item) =>
        item.food.id === foodId ? { ...item, quantity: nextQuantity } : item,
      ),
    );
  }

  function updateCartNotes(foodId: string, notes: string) {
    setCart((prev) =>
      prev.map((item) => (item.food.id === foodId ? { ...item, notes } : item)),
    );
  }

  function removeCartTopping(foodId: string, toppingId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.food.id === foodId
          ? {
              ...item,
              toppings: (item.toppings ?? []).filter(
                (topping) => topping.id !== toppingId,
              ),
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
      prev.map((item) =>
        item.food.id === foodId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    );
  }

  function removeCartItem(foodId: string) {
    setCart((prev) => prev.filter((item) => item.food.id !== foodId));
  }

  function clearCart() {
    setCart([]);
    setCartOpen(false);
  }

  async function handleAddWishlist() {
    if (!merchant?.id) return;

    try {
      await addWishlist(merchant.id);

      notify.success("Đã thêm vào yêu thích.");
    } catch (error) {
      console.error(error);
      notify.error("Thêm wishlist thất bại.");
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/customer");
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

  function openEditFoodModal(item: CartItem) {
    setPendingFood(item.food);
    setPendingQuantity(item.quantity);
    setPendingNotes(item.notes ?? "");
    setPendingToppingIds((item.toppings ?? []).map((topping) => topping.id));
    setPendingMode("edit");
    setCartOpen(false);
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),transparent_34%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-72 animate-pulse rounded-4xl bg-white/70 shadow-2xl" />

          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-white/70 shadow-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-6 text-center">
        <div className="rounded-4xl border border-white/70 bg-white/80 p-10 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl">
          <h2 className="text-2xl font-black text-slate-950">
            Không tìm thấy quán
          </h2>

          <p className="mt-3 text-sm text-slate-500">
            Merchant này có thể đã bị xoá hoặc không tồn tại.
          </p>
        </div>
      </div>
    );
  }

  const name = merchant.name || "Unnamed merchant";

  const menuItems = merchant.menu || merchant.foods || [];
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
      className={`relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 pt-6 text-slate-950 ${
        cart.length > 0 ? "pb-28" : "pb-6"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />

      <div className="relative mx-auto max-w-6xl">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 inline-flex h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-4 text-sm font-black text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:text-cyan-800 hover:shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* hero */}
        <section className="relative overflow-hidden rounded-[36px] border border-white/50 bg-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
          <div className="absolute inset-0 bg-linear-to-br from-cyan-300/10 via-transparent to-amber-300/10 opacity-50" />

          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl mix-blend-multiply" />
          <div className="absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl mix-blend-multiply" />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
                Featured Merchant
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 leading-[1.15]">
                {name}
              </h1>

              {merchant.address && (
                <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-slate-600">
                  <MapPin className="h-4.5 w-4.5 text-cyan-700" />
                  {merchant.address}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviews(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-linear-to-r from-amber-50/90 to-orange-50/90 px-3.5 py-1.5 text-[13px] font-black text-amber-800 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <Star
                    className={
                      displayRating
                        ? "h-4 w-4 fill-amber-400 text-amber-500"
                        : "h-4 w-4 text-amber-400"
                    }
                  />
                  {displayRating
                    ? `Đánh giá ${formatRating(displayRating)} sao${reviewCount > 0 ? ` (${reviewCount} đánh giá)` : ""}`
                    : "Chưa có đánh giá"}
                </button>

                {merchant.phone && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/90">
                    <Phone className="h-4 w-4 text-cyan-700" />
                    {merchant.phone}
                  </span>
                )}

                {merchant.email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white/90">
                    <Mail className="h-4 w-4 text-cyan-700" />
                    {merchant.email}
                  </span>
                )}
              </div>

              {descriptionInfo.summary && (
                <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-600 font-medium">
                  {descriptionInfo.summary}
                </p>
              )}

              {visibleFacts.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {visibleFacts.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex items-center rounded-full border border-cyan-200/50 bg-cyan-50/80 px-3.5 py-1.5 text-[13px] font-bold text-cyan-800 shadow-sm"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-start justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleAddWishlist()}
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-5 py-3.5 text-[15px] font-black text-cyan-700 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-linear-to-r hover:from-cyan-50 hover:to-blue-50 hover:shadow-md"
              >
                <Heart className="h-5 w-5 transition-transform duration-300 group-hover:scale-125 group-hover:fill-rose-400 group-hover:text-rose-500" />
                Thêm yêu thích
              </button>
            </div>
          </div>
        </section>

        {/* menu */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                Signature Menu
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Menu nổi bật
              </h2>
            </div>
          </div>

          {isOfflineOrder && (
            <div className="mb-5 rounded-2xl border border-cyan-200/70 bg-cyan-50/80 px-5 py-4 text-sm font-bold text-cyan-900 shadow-sm backdrop-blur">
              Bạn đang xem menu tại quán.
            </div>
          )}

          {menuItems.length > 0 ? (
            <div
              className={
                menuItems.length === 1
                  ? "grid gap-4"
                  : "grid gap-4 lg:grid-cols-2"
              }
            >
              {menuItems.map((food) => (
                <div
                  key={food.id}
                  className="group relative overflow-hidden rounded-[28px] border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)] hover:border-white/80"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full" />
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex gap-5">
                    {food.imageUrl ? (
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl shadow-sm">
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-cyan-50 to-blue-50 text-cyan-700 shadow-sm transition-transform duration-500 group-hover:scale-105">
                        <Flame className="h-8 w-8" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 flex flex-col">
                      <h3 className="line-clamp-1 text-[17px] font-black text-slate-900 group-hover:text-cyan-800 transition-colors">
                        {food.name}
                      </h3>

                      {food.description && (
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-relaxed text-slate-500">
                          {food.description}
                        </p>
                      )}

                      {food.categoryDetail?.length ? (
                        <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {food.categoryDetail.join(" • ")}
                        </p>
                      ) : null}

                      <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[17px] font-black tracking-tight text-cyan-700">
                            {formatPrice(food.price)}
                          </p>
                          {getCartQuantity(cart, food.id) > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                              <ShoppingCart className="h-3 w-3" />
                              {getCartQuantity(cart, food.id)} trong đơn
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openAddFoodModal(food)}
                          disabled={isOfflineOrder}
                          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                          <Plus className="h-4 w-4" />
                          {isOfflineOrder ? "Gọi tại quán" : "Thêm"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-amber-200 bg-white/75 p-8 text-center shadow-xl shadow-slate-950/5">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Flame className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">
                Quán chưa cập nhật menu
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Khi merchant bổ sung món ăn, menu sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </section>

        {showReviews && (
          <section
            ref={reviewSectionRef}
            id="review-section"
            className="mt-8 overflow-hidden rounded-4xl border border-white/70 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl"
          >
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
                Community Reviews
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Đánh giá khách hàng
              </h2>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div
                    key={review.id || `${review.createdAt}-${index}`}
                    className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm ring-1 ring-slate-950/5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 text-xs font-black text-cyan-800 ring-1 ring-cyan-200">
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
                        <p className="truncate text-sm font-black text-slate-950">
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
                      <div className="mb-3 flex items-center gap-1 text-amber-500">
                        {Array.from({
                          length: review.rating,
                        }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className="fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 text-xs font-black uppercase text-slate-400">
                        Chưa chấm sao
                      </div>
                    )}

                    <p className="text-sm leading-7 text-slate-700">
                      {getReviewContent(review) || "Không có nội dung."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-amber-500 shadow-sm">
                  <Star className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Chưa có đánh giá khách hàng.
                </p>
              </div>
            )}
          </section>
        )}

        {pendingFood && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={`Chọn số lượng ${pendingFood.name}`}
            onClick={closeAddFoodModal}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-950/20"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                    Thêm món
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {pendingFood.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAddFoodModal}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  aria-label="Đóng chọn số lượng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-center justify-between gap-4 rounded-3xl bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Số lượng muốn thêm
                    </p>
                    <p className="mt-1 text-lg font-black text-cyan-700">
                      {formatPrice(pendingFood.price)} / món
                    </p>
                  </div>

                  <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingQuantity((current) =>
                          Math.max(1, current - 1),
                        )
                      }
                      className="grid h-12 w-12 place-items-center text-slate-600 transition hover:bg-slate-50"
                      aria-label="Giảm số lượng"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      value={pendingQuantity}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);

                        setPendingQuantity(
                          Number.isFinite(nextValue)
                            ? Math.max(
                                1,
                                Math.min(99, Math.floor(nextValue || 1)),
                              )
                            : 1,
                        );
                      }}
                      className="h-12 w-16 border-x border-slate-200 text-center text-sm font-black text-slate-950 outline-none"
                      inputMode="numeric"
                      aria-label="Số lượng món muốn thêm"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setPendingQuantity((current) =>
                          Math.min(99, current + 1),
                        )
                      }
                      className="grid h-12 w-12 place-items-center text-slate-600 transition hover:bg-slate-50"
                      aria-label="Tăng số lượng"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {pendingFood.toppings && pendingFood.toppings.length > 0 && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">
                        Topping
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        Chọn nhiều tùy ý
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {pendingFood.toppings.map((topping) => {
                        const checked = pendingToppingIds.includes(topping.id);
                        return (
                          <label
                            key={topping.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextChecked = event.target.checked;
                                  setPendingToppingIds((prev) => {
                                    if (nextChecked) {
                                      return Array.from(
                                        new Set([...prev, topping.id]),
                                      );
                                    }
                                    return prev.filter(
                                      (id) => id !== topping.id,
                                    );
                                  });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                              />
                              <span className="font-semibold text-slate-700">
                                {topping.name}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                              +{formatPrice(topping.price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-sm font-black text-slate-900">
                    Ghi chú món
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {NOTE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPendingNotes((prev) => {
                            const exists = prev
                              .toLowerCase()
                              .includes(preset.toLowerCase());
                            if (exists) return prev;
                            const nextValue = [prev.trim(), preset]
                              .filter(Boolean)
                              .join(", ");
                            return nextValue;
                          });
                        }}
                        className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-100"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <input
                    value={pendingNotes}
                    onChange={(event) => setPendingNotes(event.target.value)}
                    placeholder="Ví dụ: bỏ hành, ít đá"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeAddFoodModal}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const selectedToppings = (
                        pendingFood.toppings ?? []
                      ).filter((topping) =>
                        pendingToppingIds.includes(topping.id),
                      );
                      if (pendingMode === "edit") {
                        updateCartItem(
                          pendingFood.id,
                          pendingQuantity,
                          pendingNotes,
                          selectedToppings,
                        );
                      } else {
                        addToCart(
                          pendingFood,
                          pendingQuantity,
                          pendingNotes,
                          selectedToppings,
                        );
                      }
                      closeAddFoodModal();
                    }}
                    className="rounded-2xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700"
                  >
                    {pendingMode === "edit" ? "Cập nhật" : "Thêm vào đơn"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {cartOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-4 py-4 backdrop-blur-sm sm:items-stretch sm:justify-end sm:p-0"
            role="dialog"
            aria-modal="true"
            aria-label="Đơn đang đặt"
            onClick={() => setCartOpen(false)}
          >
            <div
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-950/20 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-[28px]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                    Order draft
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Đơn đang đặt
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  aria-label="Đóng đơn đang đặt"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[52vh] overflow-y-auto px-5 py-4 sm:max-h-none sm:flex-1">
                {cart.length > 0 ? (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.food.id}
                        className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                      >
                        {item.food.imageUrl ? (
                          <img
                            src={item.food.imageUrl}
                            alt={item.food.name}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="grid h-16 w-16 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                            <Flame className="h-6 w-6" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {item.food.name}
                          </p>
                          <p className="mt-1 text-sm font-bold text-cyan-700">
                            {formatPrice(item.food.price)}
                          </p>
                          {item.food.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {item.food.description}
                            </p>
                          )}

                          {(() => {
                            const toppingTotal = (item.toppings ?? []).reduce(
                              (sum, topping) => sum + (topping.price || 0),
                              0,
                            );
                            if (!toppingTotal) return null;
                            return (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Topping +{formatPrice(toppingTotal)}
                              </p>
                            );
                          })()}

                          {(item.toppings ?? []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.toppings?.map((topping) => (
                                <span
                                  key={topping.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                                >
                                  +{topping.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeCartTopping(
                                        item.food.id,
                                        topping.id,
                                      )
                                    }
                                    className="grid h-4 w-4 place-items-center rounded-full text-emerald-700 transition hover:bg-emerald-100"
                                    aria-label={`Xóa ${topping.name}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2">
                            <input
                              placeholder="Ghi chú cho món (ví dụ: bỏ hành)"
                              value={item.notes ?? ""}
                              onChange={(e) =>
                                updateCartNotes(item.food.id, e.target.value)
                              }
                              className="w-full rounded-md border border-slate-200 px-3 py-1 text-sm outline-none"
                            />
                            {item.food.toppings &&
                              item.food.toppings.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openEditFoodModal(item)}
                                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-100"
                                >
                                  Chỉnh topping
                                </button>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => decrementCartItem(item.food.id)}
                              className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50"
                              aria-label={`Giảm ${item.food.name}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <input
                              value={item.quantity}
                              onChange={(event) =>
                                updateCartQuantity(
                                  item.food.id,
                                  Number(event.target.value),
                                )
                              }
                              className="h-10 w-14 border-x border-slate-200 text-center text-sm font-black text-slate-950 outline-none"
                              inputMode="numeric"
                              aria-label={`Số lượng ${item.food.name}`}
                            />

                            <button
                              type="button"
                              onClick={() => incrementCartItem(item.food.id)}
                              className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50"
                              aria-label={`Tăng ${item.food.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.food.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <ShoppingCart className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-bold text-slate-500">
                      Chưa có món nào trong đơn.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                {!isOfflineOrder && (
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Phương thức thanh toán
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setOnlinePaymentMethod("COD")}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                          onlinePaymentMethod === "COD"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Thanh toán khi nhận hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnlinePaymentMethod("BankTransfer")}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                          onlinePaymentMethod === "BankTransfer"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Chuyển khoản
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      {cartItemCount} món đã chọn
                    </p>
                    <p className="text-2xl font-black text-cyan-700">
                      {formatPrice(total)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCart}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        Xóa hết
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCreateOrder()}
                      disabled={ordering || cart.length === 0}
                      className="rounded-2xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ordering
                        ? "Đang đặt..."
                        : isOfflineOrder
                          ? "Gọi tại quán"
                          : "Đặt món"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* cart */}
        {cart.length > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
            <div className="pointer-events-auto mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl shadow-cyan-950/15 ring-1 ring-slate-950/5 backdrop-blur-2xl sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {cartItemCount} món trong giỏ
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-cyan-700">
                    {formatPrice(total)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-5 py-3 text-sm font-black text-cyan-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Xem đơn
                  </button>

                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    disabled={ordering || cart.length === 0}
                    className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-cyan-900/20 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {ordering
                      ? "Đang đặt..."
                      : isOfflineOrder
                        ? "Gọi tại quán"
                        : "Đặt món ngay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
