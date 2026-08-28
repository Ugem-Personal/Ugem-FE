import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Loader2,
  Store,
  Tag,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  getMerchantCheckoutCampaigns,
  type CheckoutCampaign,
  type CustomerOrderType,
} from "../services/orderService";
import {
  DeliveryLocationPicker,
  type DeliveryLocation,
} from "./DeliveryLocationPicker";

export type CheckoutPaymentMethod = "COD" | "Cash" | "BankTransfer";

export type CheckoutFormData = {
  recipientName: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  orderType: CustomerOrderType;
  paymentMethod: CheckoutPaymentMethod;
  campaignId?: string;
  campaignCode?: string;
};

type CheckoutDialogProps = {
  open: boolean;
  merchantId: string;
  total: number;
  merchantLatitude?: number;
  merchantLongitude?: number;
  defaultRecipientName?: string;
  defaultOrderType?: CustomerOrderType;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: CheckoutFormData) => Promise<void>;
};

function formatPrice(value: number) {
  return `${Math.max(0, value).toLocaleString("vi-VN")}đ`;
}

function calculateDiscount(campaign: CheckoutCampaign | null, total: number) {
  if (!campaign) return 0;

  const rawDiscount = campaign.isPercentage
    ? total * (campaign.discountValue / 100)
    : campaign.discountValue;
  const cappedDiscount = campaign.maxDiscountAmount
    ? Math.min(rawDiscount, campaign.maxDiscountAmount)
    : rawDiscount;

  return Math.min(total, cappedDiscount);
}

function getCampaignEligibilityError(
  campaign: CheckoutCampaign,
  total: number,
) {
  const now = Date.now();
  if (!campaign.isActive) return "Ưu đãi đang tạm dừng";
  if (now < new Date(campaign.startDate).getTime()) return "Ưu đãi chưa bắt đầu";
  if (now > new Date(campaign.endDate).getTime()) return "Ưu đãi đã hết hạn";
  if (
    campaign.quantity != null &&
    campaign.quantity > 0 &&
    (campaign.usedCount ?? 0) >= campaign.quantity
  ) {
    return "Ưu đãi đã hết lượt";
  }
  if (total < Number(campaign.minOrderAmount ?? 0)) {
    return `Cần đơn tối thiểu ${formatPrice(Number(campaign.minOrderAmount))}`;
  }
  return "";
}

export function CheckoutDialog({
  open,
  merchantId,
  total,
  merchantLatitude,
  merchantLongitude,
  defaultRecipientName = "",
  defaultOrderType = "Online",
  submitting,
  onOpenChange,
  onConfirm,
}: CheckoutDialogProps) {
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>({
    address: "",
  });
  const [orderType, setOrderType] =
    useState<CustomerOrderType>(defaultOrderType);
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>(defaultOrderType === "Online" ? "COD" : "Cash");
  const [campaignCode, setCampaignCode] = useState("");
  const [appliedCampaign, setAppliedCampaign] =
    useState<CheckoutCampaign | null>(null);
  const [checkingCampaign, setCheckingCampaign] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState("");
  const [availableCampaigns, setAvailableCampaigns] = useState<
    CheckoutCampaign[]
  >([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const merchantProximity = useMemo(() => {
    if (
      Number.isFinite(merchantLatitude) &&
      Number.isFinite(merchantLongitude)
    ) {
      return {
        lat: merchantLatitude as number,
        lng: merchantLongitude as number,
      };
    }
    return null;
  }, [merchantLatitude, merchantLongitude]);

  useEffect(() => {
    if (!open) return;
    setRecipientName(defaultRecipientName);
    setOrderType(defaultOrderType);
    setPaymentMethod(defaultOrderType === "Online" ? "COD" : "Cash");
    setErrors({});
  }, [open, defaultOrderType, defaultRecipientName]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const campaigns = await getMerchantCheckoutCampaigns(merchantId);
        if (active) setAvailableCampaigns(campaigns);
      } catch (error) {
        console.error(error);
        if (active) setAvailableCampaigns([]);
      } finally {
        if (active) setLoadingCampaigns(false);
      }
    };

    void loadCampaigns();
    return () => {
      active = false;
    };
  }, [merchantId, open]);

  const discount = useMemo(
    () => calculateDiscount(appliedCampaign, total),
    [appliedCampaign, total],
  );

  async function resolveCampaign() {
    const normalizedCode = campaignCode.trim().toUpperCase();

    if (!normalizedCode) {
      setAppliedCampaign(null);
      setCampaignMessage("");
      return null;
    }

    setCheckingCampaign(true);
    setCampaignMessage("");

    try {
      const campaigns = availableCampaigns.length
        ? availableCampaigns
        : await getMerchantCheckoutCampaigns(merchantId);
      const campaign = campaigns.find(
        (item) => item.code?.trim().toUpperCase() === normalizedCode,
      );

      if (!campaign) {
        throw new Error("Mã giảm giá không tồn tại tại quán này.");
      }
      const eligibilityError = getCampaignEligibilityError(campaign, total);
      if (eligibilityError) throw new Error(eligibilityError);

      setAppliedCampaign(campaign);
      setCampaignMessage(`Đã áp dụng ${campaign.code}.`);
      return campaign;
    } catch (error) {
      setAppliedCampaign(null);
      setCampaignMessage(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra mã giảm giá.",
      );
      return undefined;
    } finally {
      setCheckingCampaign(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!recipientName.trim()) {
      nextErrors.recipientName = "Vui lòng nhập tên người nhận.";
    }
    if (orderType === "Online" && !deliveryLocation.address.trim()) {
      nextErrors.deliveryAddress = "Vui lòng chọn địa chỉ giao hàng.";
    } else if (
      orderType === "Online" &&
      (!Number.isFinite(deliveryLocation.latitude) ||
        !Number.isFinite(deliveryLocation.longitude))
    ) {
      nextErrors.deliveryAddress =
        "Hãy chọn một gợi ý hoặc dùng vị trí hiện tại để xác định tọa độ.";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const campaign = campaignCode.trim()
      ? appliedCampaign?.code.toUpperCase() === campaignCode.trim().toUpperCase()
        ? appliedCampaign
        : await resolveCampaign()
      : null;

    if (campaignCode.trim() && !campaign) return;

    await onConfirm({
      recipientName: recipientName.trim(),
      deliveryAddress:
        orderType === "Online" ? deliveryLocation.address.trim() : "Tại quán",
      deliveryLatitude:
        orderType === "Online" ? deliveryLocation.latitude : undefined,
      deliveryLongitude:
        orderType === "Online" ? deliveryLocation.longitude : undefined,
      orderType,
      paymentMethod,
      campaignId: campaign?.id,
      campaignCode: campaign?.code,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-3xl border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-950 dark:text-white">
            Xác nhận thông tin đặt món
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Kiểm tra thông tin nhận món trước khi gửi đơn đến quán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-cyan-600" /> Người nhận *
              </span>
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Ví dụ: Customer UAT"
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950"
              />
              {errors.recipientName ? (
                <span className="block text-xs text-rose-600" role="alert">
                  {errors.recipientName}
                </span>
              ) : null}
            </label>

            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                {orderType === "Online" ? (
                  <Truck className="h-4 w-4 text-cyan-600" />
                ) : (
                  <Store className="h-4 w-4 text-cyan-600" />
                )}
                Hình thức nhận món *
              </span>
              <div className="flex h-12 items-center gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50/80 dark:border-cyan-500/30 dark:bg-cyan-500/10 px-4 text-sm font-black text-cyan-800 dark:text-cyan-300 shadow-2xs">
                {orderType === "Online" ? (
                  <>
                    <Truck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Giao hàng tận nơi</span>
                  </>
                ) : (
                  <>
                    <Store className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Tự đến lấy / Ăn tại quán</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {orderType === "Online" ? (
            <DeliveryLocationPicker
              value={deliveryLocation}
              error={errors.deliveryAddress}
              proximity={merchantProximity}
              onChange={(location) => {
                setDeliveryLocation(location);
                setErrors((current) => ({ ...current, deliveryAddress: "" }));
              }}
            />
          ) : (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Store className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Đơn hàng sẽ được chuẩn bị tại quán. Quý khách vui lòng nhận món và thanh toán trực tiếp tại quán.</span>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <WalletCards className="h-4 w-4 text-cyan-600" /> Thanh toán *
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(orderType === "Online"
                ? (["COD", "BankTransfer"] as const)
                : (["Cash", "BankTransfer"] as const)
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={paymentMethod === value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
                    paymentMethod === value
                      ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  {value === "COD"
                    ? "COD - trả khi nhận"
                    : value === "Cash"
                      ? "Tiền mặt tại quán"
                      : "Chuyển khoản"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <Tag className="h-4 w-4 text-cyan-600" /> Ưu đãi dành cho bạn
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Chọn ưu đãi đang có tại quán, không cần nhớ mã.
                </p>
              </div>
              {loadingCampaigns ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
              ) : null}
            </div>

            {availableCampaigns.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableCampaigns.map((campaign) => {
                  const eligibilityError = getCampaignEligibilityError(
                    campaign,
                    total,
                  );
                  const selected = appliedCampaign?.id === campaign.id;

                  return (
                    <button
                      key={campaign.id}
                      type="button"
                      disabled={Boolean(eligibilityError)}
                      aria-pressed={selected}
                      onClick={() => {
                        setCampaignCode(campaign.code);
                        setAppliedCampaign(campaign);
                        setCampaignMessage(`Đã áp dụng ${campaign.code}.`);
                      }}
                      className={`min-h-24 rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15 dark:bg-emerald-500/10"
                          : eligibilityError
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-white/10 dark:bg-white/5"
                            : "border-cyan-200 bg-cyan-50/60 hover:border-cyan-400 hover:bg-cyan-50 dark:border-cyan-500/25 dark:bg-cyan-500/5"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block font-mono text-sm font-black text-cyan-700 dark:text-cyan-300">
                            {campaign.code}
                          </span>
                          <span className="mt-0.5 block text-sm font-black text-slate-900 dark:text-white">
                            {campaign.title}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-black text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300">
                          {campaign.isPercentage
                            ? `-${campaign.discountValue}%`
                            : `-${formatPrice(campaign.discountValue)}`}
                        </span>
                      </span>
                      <span className="mt-2 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {eligibilityError ||
                          `Đơn từ ${formatPrice(Number(campaign.minOrderAmount ?? 0))}${
                            campaign.maxDiscountAmount
                              ? ` • Giảm tối đa ${formatPrice(campaign.maxDiscountAmount)}`
                              : ""
                          }`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : !loadingCampaigns ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                Quán hiện chưa có ưu đãi khả dụng.
              </div>
            ) : null}

            <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/50">
              <summary className="cursor-pointer text-xs font-black text-slate-700 dark:text-slate-300">
                Nhập mã ưu đãi khác
              </summary>
              <div className="mt-3">
            <label htmlFor="campaign-code" className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <Tag className="h-4 w-4 text-cyan-600" /> Mã giảm giá
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="campaign-code"
                value={campaignCode}
                onChange={(event) => {
                  setCampaignCode(event.target.value.toUpperCase());
                  setAppliedCampaign(null);
                  setCampaignMessage("");
                }}
                placeholder="Ví dụ: UAT10"
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 font-mono font-black uppercase outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => void resolveCampaign()}
                disabled={checkingCampaign || !campaignCode.trim()}
                className="h-12 min-w-24 rounded-xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
              >
                {checkingCampaign ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Áp dụng"}
              </button>
            </div>
            {campaignMessage ? (
              <p
                className={`text-xs font-bold ${appliedCampaign ? "text-emerald-600" : "text-rose-600"}`}
                role="status"
              >
                {campaignMessage}
              </p>
            ) : null}
              </div>
            </details>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Tạm tính</span><span>{formatPrice(total)}</span>
            </div>
            {discount > 0 ? (
              <div className="mt-2 flex justify-between text-sm font-bold text-emerald-600">
                <span>Giảm giá</span><span>-{formatPrice(discount)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950 dark:border-white/10 dark:text-white">
              <span>Tổng thanh toán</span><span className="text-cyan-600">{formatPrice(total - discount)}</span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Quay lại giỏ
            </button>
            <button
              type="submit"
              disabled={submitting || checkingCampaign || total <= 0}
              className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Đang đặt món..." : "Đặt món ngay"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
