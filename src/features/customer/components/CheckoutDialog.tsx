import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Coins,
  Loader2,
  Sparkles,
  Store,
  Tag,
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
import { getReviewerProfile } from "../services/customerService";

export type CheckoutPaymentMethod = "Cash" | "BankTransfer";

export type CheckoutFormData = {
  recipientName: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  orderType: CustomerOrderType;
  paymentMethod: CheckoutPaymentMethod;
  campaignId?: string;
  campaignCode?: string;
  pointsToRedeem?: number;
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
  if (now < new Date(campaign.startDate).getTime())
    return "Ưu đãi chưa bắt đầu";
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
  defaultRecipientName = "",
  submitting,
  onOpenChange,
  onConfirm,
}: CheckoutDialogProps) {
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("Cash");
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
  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [usePoints, setUsePoints] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setRecipientName(defaultRecipientName);
    setPaymentMethod("Cash");
    setErrors({});
  }, [open, defaultRecipientName]);

  useEffect(() => {
    if (!open) return;
    void getReviewerProfile()
      .then((res) => {
        if (res && typeof res.reviewerPoints === "number") {
          setCustomerPoints(res.reviewerPoints);
        }
      })
      .catch(() => {});
  }, [open]);

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

  const remainingBill = Math.max(0, total - discount);
  const POINT_TO_VND_RATE = 100;
  const maxPointsPossible = Math.min(
    customerPoints,
    Math.floor(remainingBill / POINT_TO_VND_RATE),
  );
  const pointsDiscount = usePoints && maxPointsPossible > 0 ? maxPointsPossible * POINT_TO_VND_RATE : 0;
  const finalPayable = Math.max(0, remainingBill - pointsDiscount);

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
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const campaign = campaignCode.trim()
      ? appliedCampaign?.code.toUpperCase() ===
        campaignCode.trim().toUpperCase()
        ? appliedCampaign
        : await resolveCampaign()
      : null;

    if (campaignCode.trim() && !campaign) return;

    await onConfirm({
      recipientName: recipientName.trim(),
      deliveryAddress: "Tại quán",
      deliveryLatitude: undefined,
      deliveryLongitude: undefined,
      orderType: "Offline",
      paymentMethod,
      campaignId: campaign?.id,
      campaignCode: campaign?.code,
      pointsToRedeem:
        usePoints && maxPointsPossible > 0 ? maxPointsPossible : undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-w-3xl border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-950 dark:text-white">
            Xác nhận thông tin đặt món tại quán
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Kiểm tra thông tin nhận món và hình thức thanh toán trước khi gửi đơn đến quán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4">
            <label className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-cyan-600" /> Tên khách nhận món *
              </span>
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Ví dụ: Anh Cường"
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950"
              />
              {errors.recipientName ? (
                <span className="block text-xs text-rose-600" role="alert">
                  {errors.recipientName}
                </span>
              ) : null}
            </label>

          </div>

          <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-3.5 text-xs font-semibold text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300 flex items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span>Ăn tại quán · Đơn sẽ được gửi đến quán để xác nhận.</span>
          </div>

          <div className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <span>Phương thức thanh toán</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("Cash")}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black transition ${
                  paymentMethod === "Cash"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
                }`}
              >
                <Banknote className="h-4 w-4" /> Tiền mặt tại quầy
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("BankTransfer")}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black transition ${
                  paymentMethod === "BankTransfer"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
                }`}
              >
                <WalletCards className="h-4 w-4" /> VietQR / Chuyển khoản
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Tag className="h-4 w-4 text-cyan-600" /> Mã giảm giá của quán
              </span>
              {loadingCampaigns ? (
                <span className="text-xs font-semibold text-slate-400">
                  Đang tải ưu đãi...
                </span>
              ) : null}
            </div>

            <div className="flex gap-2">
              <input
                value={campaignCode}
                onChange={(event) =>
                  setCampaignCode(event.target.value.toUpperCase())
                }
                placeholder="Nhập mã ưu đãi..."
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-black tracking-wider uppercase outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => void resolveCampaign()}
                disabled={checkingCampaign || !campaignCode.trim()}
                className="h-11 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {checkingCampaign ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Áp dụng"
                )}
              </button>
            </div>

            {campaignMessage ? (
              <p
                className={`text-xs font-semibold ${
                  appliedCampaign ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {campaignMessage}
              </p>
            ) : null}

            {availableCampaigns.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {availableCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => {
                      setCampaignCode(campaign.code);
                      setAppliedCampaign(campaign);
                      setCampaignMessage(`Đã chọn ${campaign.code}.`);
                    }}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-50/60 px-2.5 py-1 text-[11px] font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/20 dark:bg-cyan-950/40 dark:text-cyan-300"
                  >
                    {campaign.code} ({campaign.isPercentage ? `${campaign.discountValue}%` : `${campaign.discountValue / 1000}k`})
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* UFind Reviewer Points Redemption Switch */}
          {customerPoints > 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 dark:border-amber-500/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      Điểm thưởng UFind
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                        <Sparkles className="h-2.5 w-2.5" /> Có {customerPoints} điểm
                      </span>
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      1 điểm = 100đ (Dùng tối đa {maxPointsPossible} điểm = -{formatPrice(maxPointsPossible * POINT_TO_VND_RATE)})
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="peer sr-only"
                    disabled={maxPointsPossible <= 0}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-slate-600 dark:bg-slate-700" />
                </label>
              </div>
              {usePoints && maxPointsPossible > 0 ? (
                <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 flex justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span>Trừ điểm thưởng ({maxPointsPossible} điểm):</span>
                  <span>-{formatPrice(pointsDiscount)}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Tạm tính</span>
              <span>{formatPrice(total)}</span>
            </div>
            {discount > 0 ? (
              <div className="mt-2 flex justify-between text-sm font-bold text-emerald-600">
                <span>Giảm giá mã khuyến mãi</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            ) : null}
            {usePoints && pointsDiscount > 0 ? (
              <div className="mt-2 flex justify-between text-sm font-bold text-amber-600">
                <span>Trừ điểm UFind ({maxPointsPossible}đ)</span>
                <span>-{formatPrice(pointsDiscount)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950 dark:border-white/10 dark:text-white">
              <span>Tổng thanh toán</span>
              <span className="text-cyan-600">
                {formatPrice(finalPayable)}
              </span>
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
