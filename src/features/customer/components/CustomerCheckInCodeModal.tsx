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
} from "lucide-react";
import { api } from "@/lib/axios";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/components/ui/button";

type CustomerCodeData = {
  customerId: string;
  customerCode: string;
  qrDataUrl: string;
  fullName: string;
  phoneNumber?: string;
  reviewerPoints: number;
  reviewerRank: string;
  activeBenefits: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CustomerCheckInCodeModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CustomerCodeData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    async function loadCode() {
      setLoading(true);
      try {
        const res = await api.get("/api/v1/check-ins/my-code");
        if (active && res.data?.data) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
        notify.error("Không lấy được mã check-in. Vui lòng thử lại.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCode();

    return () => {
      active = false;
    };
  }, [open]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Mã Check-in Tích Điểm
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đưa mã cho Chủ quán / Nhân viên khi đến quán
            </p>
          </div>
        </div>

        {loading ? (
          <div className="my-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-sm font-medium">Đang tạo mã định danh...</p>
          </div>
        ) : data ? (
          <div className="mt-5 space-y-5">
            {/* Customer Code Display */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-200/80 dark:border-cyan-800/40 bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/70 dark:from-cyan-950/30 dark:via-slate-900 dark:to-sky-950/20 p-5 text-center shadow-inner">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Mã Khách Hàng (Duy nhất)
              </span>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-3xl font-black tracking-wider text-slate-950 dark:text-white">
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
                <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-3 shadow-md">
                  <img
                    src={data.qrDataUrl}
                    alt={`QR Code ${data.customerCode}`}
                    className="h-44 w-44 object-contain"
                  />
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Chủ quán quét mã hoặc nhập mã code trên để xác nhận check-in
              </p>
            </div>

            {/* Loyalty Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 p-3 text-amber-900 dark:text-amber-200">
                <Coins className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400">
                    Điểm tích lũy
                  </div>
                  <div className="font-mono text-base font-black">
                    {data.reviewerPoints} pts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/80 dark:bg-purple-950/20 p-3 text-purple-900 dark:text-purple-200">
                <ShieldCheck className="h-5 w-5 shrink-0 text-purple-500" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-purple-700/80 dark:text-purple-400">
                    Hạng thẻ
                  </div>
                  <div className="text-base font-black truncate">
                    {data.reviewerRank || "Đồng"}
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits list */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                <Gift className="h-4 w-4" />
                Quyền lợi khi Check-in tại quán:
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Giảm 5%</strong> cho hóa đơn tiếp theo tại quán.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Tặng thêm <strong>1 ly Coca / Nước ngọt</strong> miễn phí.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Tự động cộng <strong>+10 điểm thưởng</strong> vào ví UGem.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">★</span>
                  <span>Đánh giá quán khi checkout: nhận thêm <strong>+20 điểm thưởng</strong>!</span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="default"
            className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
            onClick={onClose}
          >
            Đã hiểu
          </Button>
        </div>
      </div>
    </div>
  );
}
