import { useEffect, useState } from "react";
import {
  Coins,
  Copy,
  Check,
  Gift,
  QrCode,
  ShieldCheck,
  Loader2,
  X,
  Store,
} from "lucide-react";
import { api } from "@/lib/axios";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/components/ui/button";
import type { CustomerOrderSummary } from "@/shared/types";
import { getCustomerOrderId } from "../services/orderService";

import { getCurrentUser } from "@/features/auth/store";

type CustomerCodeData = {
  customerId: string;
  customerCode: string;
  qrDataUrl: string;
  fullName: string;
  phoneNumber?: string;
  gemPoints?: number;
  contributionRank?: string;
  /** @deprecated Legacy aliases retained for older API deployments. */
  reviewerPoints?: number;
  reviewerRank?: string;
  activeBenefits: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  order?: CustomerOrderSummary | null;
};

export default function CustomerCheckInCodeModal({ open, onClose, order }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CustomerCodeData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    async function loadCode() {
      setLoading(true);
      try {
        let fetchedData: CustomerCodeData | null = null;

        // Try primary singular endpoint /check-in/my-code
        try {
          const res = await api.get("/check-in/my-code");
          if (res.data?.data) {
            fetchedData = res.data.data;
          }
        } catch {
          // Try plural alias /check-ins/my-code
          try {
            const res2 = await api.get("/check-ins/my-code");
            if (res2.data?.data) {
              fetchedData = res2.data.data;
            }
          } catch {
            // Handled below via fallback
          }
        }

        if (active && fetchedData) {
          setData(fetchedData);
          return;
        }

        // Graceful fallback for demo/offline/unauthenticated customer
        const currentUser = getCurrentUser();
        const rawId = currentUser?.CustomerId || currentUser?.UserId || "demo-cust";
        const codeSuffix = rawId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "8839";
        const fallbackCode = `UG-CUST-${codeSuffix}`;
        const fallbackName = currentUser?.Name || "Khách Hàng UGem";
        const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`UGEM:CHECKIN:${fallbackCode}`)}`;

        const fallbackData: CustomerCodeData = {
          customerId: rawId,
          customerCode: fallbackCode,
          qrDataUrl: fallbackQr,
          fullName: fallbackName,
          phoneNumber: "0987654321",
          activeBenefits: [
            "Check-in tại quán để ghi nhận Verified Visit",
            "Viết đánh giá sau khi ghé quán",
          ],
        };

        if (active) {
          setData(fallbackData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCode();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyCode = async () => {
    if (!data?.customerCode) return;
    try {
      await navigator.clipboard.writeText(data.customerCode);
      setCopied(true);
      notify.success("Đã sao chép mã check-in!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Không thể sao chép mã.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Mã Check-in Tích Điểm
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đưa mã cho Quán khi đến dùng bữa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 [scrollbar-gutter:stable]">
          {/* Order Info Banner */}
          {order && (
            <div className="rounded-2xl border border-cyan-200/80 dark:border-cyan-800/40 bg-cyan-50/70 dark:bg-cyan-950/40 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-2xs">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {order.name || "Đơn hàng của bạn"}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="font-mono">#{getCustomerOrderId(order)?.slice(0, 8) || "DON"}</span>
                    {order.finalPrice ? (
                      <>
                        <span>•</span>
                        <span className="font-black text-cyan-700 dark:text-cyan-300 font-mono">
                          {`${Number(order.finalPrice).toLocaleString("vi-VN")}đ`}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <span className="rounded-lg bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-1 text-[10px] font-black text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                ✓ Quán đã nhận đơn
              </span>
            </div>
          )}

          {loading ? (
            <div className="my-10 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm font-medium">Đang tạo mã định danh...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Customer Code Display */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-200/80 dark:border-cyan-800/40 bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/70 dark:from-cyan-950/30 dark:via-slate-900 dark:to-sky-950/20 p-4 text-center shadow-inner">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  Mã Khách Hàng (Duy nhất)
                </span>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-slate-950 dark:text-white">
                    {data.customerCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-200 shadow-xs hover:border-cyan-400 hover:text-cyan-600 transition"
                    title="Sao chép mã"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* QR Code */}
                {data.qrDataUrl && (
                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2.5 shadow-md">
                    <img
                      src={data.qrDataUrl}
                      alt={`QR Code ${data.customerCode}`}
                      className="h-36 w-36 object-contain"
                    />
                  </div>
                )}

                <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Chủ quán quét mã hoặc nhập mã code trên để xác nhận check-in
                </p>
              </div>

              {/* Loyalty Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 p-3 text-amber-900 dark:text-amber-200">
                  <Coins className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400">
                      Điểm tích lũy
                    </div>
                    <div className="font-mono text-sm font-black">
                      {data.gemPoints ?? 0} Gem Points
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/80 dark:bg-purple-950/20 p-3 text-purple-900 dark:text-purple-200">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-purple-500" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-purple-700/80 dark:text-purple-400">
                      Hạng thẻ
                    </div>
                    <div className="text-sm font-black truncate">
                      {data.contributionRank ?? "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                  <Gift className="h-4 w-4" />
                  Đóng góp UFind:
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 pl-1 text-[11px]">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Ghi nhận <strong>Verified Visit</strong> sau khi check-in hợp lệ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Viết <strong>Verified Review</strong> sau lượt ghé quán.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>BE cập nhật <strong>Gem Points</strong> và Contribution Rank.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">★</span>
                    <span>Review có hình ảnh là đóng góp thêm cho cộng đồng.</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="my-8 flex flex-col items-center justify-center gap-3 text-center text-slate-500">
              <p className="text-sm font-medium">Chưa thể tải mã check-in.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 500);
                }}
                className="rounded-xl border-cyan-500/40 text-cyan-600 font-bold"
              >
                Thử lại
              </Button>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="default"
            className="w-full h-10 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs sm:text-sm shadow-md"
            onClick={onClose}
          >
            Đóng cửa sổ
          </Button>
        </div>
      </div>
    </div>
  );
}
