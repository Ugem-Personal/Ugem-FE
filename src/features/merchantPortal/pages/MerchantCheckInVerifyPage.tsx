import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Gift,
  History,
  Loader2,
  QrCode,
  UserCheck,
  Flame,
} from "lucide-react";
import { api } from "@/lib/axios";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";

type CheckInResult = {
  checkInId: string;
  customerName: string;
  customerPhone?: string;
  customerCode: string;
  pointsAwarded: number;
  newTotalPoints: number;
  rewardBenefit: string;
  checkedInAt: string;
  status: string;
};

type CheckInHistoryItem = {
  id: string;
  orderId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string | null;
  rewardBenefit?: string | null;
  notes?: string | null;
  amount: number;
  orderType: string;
  checkedInAt?: string | null;
  verifiedAt?: string | null;
  status: string;
};

const DEFAULT_BENEFITS = [
  "Giảm 5% cho hóa đơn tiếp theo",
  "Tặng 1 ly Coca / Nước ngọt miễn phí",
  "Voucher kích cầu UFind (Giảm 20%)",
  "Tặng món khai vị / tráng miệng",
];

export default function MerchantCheckInVerifyPage() {
  const [customerCode, setCustomerCode] = useState("");
  const [selectedBenefit, setSelectedBenefit] = useState(DEFAULT_BENEFITS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  const [history, setHistory] = useState<CheckInHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get("/api/v1/check-ins/merchant/history");
      if (res.data?.data) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    const code = customerCode.trim().toUpperCase();
    if (!code) {
      notify.error("Vui lòng nhập mã khách hàng");
      return;
    }

    const benefitToApply = selectedBenefit;

    setSubmitting(true);
    try {
      const res = await api.post(
        "/api/v1/check-ins/merchant/verify-customer-code",
        {
          customerCode: code,
          rewardBenefit: benefitToApply,
          notes: notes.trim() || undefined,
        },
      );

      if (res.data?.data) {
        setLastResult(res.data.data);
        notify.success(
          `Xác nhận check-in thành công cho ${res.data.data.customerName}!`,
        );
        setCustomerCode("");
        setNotes("");
        void loadHistory();
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        "Không thể xác thực mã khách hàng. Vui lòng kiểm tra lại.";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <MerchantSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MerchantHeader />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Page Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                <QrCode className="h-3.5 w-3.5" />
                POS Check-in & Tích Điểm
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Check-in Khách Hàng Tại Quán
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Nhập mã định danh của khách để xác nhận lượt đến quán, tích lũy điểm thưởng và áp dụng ưu đãi độc quyền.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Form Input Section */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    Nhập Mã Khách Hàng
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Khách hàng mở mục "Mã Check-in của tôi" trên ứng dụng UFind để lấy mã code hoặc mã QR.
                  </p>

                  <form onSubmit={handleVerify} className="mt-5 space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Mã Code Khách Hàng *
                      </label>
                      <div className="mt-1.5 relative">
                        <Input
                          value={customerCode}
                          onChange={(e) =>
                            setCustomerCode(e.target.value.toUpperCase())
                          }
                          placeholder="Ví dụ: UFIND-A8K9X2"
                          className="h-14 font-mono text-xl font-black uppercase tracking-wider pl-4 pr-12 rounded-2xl border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                          disabled={submitting}
                          autoFocus
                        />
                        <div className="absolute right-4 top-4 text-slate-400">
                          <QrCode className="h-6 w-6" />
                        </div>
                      </div>
                    </div>

                    {/* Benefit selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        Ưu Đãi Check-in Áp Dụng
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {DEFAULT_BENEFITS.map((benefit) => (
                          <button
                            key={benefit}
                            type="button"
                            onClick={() => setSelectedBenefit(benefit)}
                            className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left text-xs font-bold transition ${
                              selectedBenefit === benefit
                                ? "border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/20"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                            }`}
                          >
                            <Gift
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                selectedBenefit === benefit
                                  ? "text-cyan-600 dark:text-cyan-400"
                                  : "text-slate-400"
                              }`}
                            />
                            <span>{benefit}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Ghi Chú Thêm (Bàn số, nhân viên phục vụ...)
                      </label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ví dụ: Bàn 04, khách quen"
                        className="rounded-xl"
                        disabled={submitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting || !customerCode.trim()}
                      className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-base shadow-lg shadow-cyan-900/15"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Đang xác thực...
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-5 w-5" />
                          Xác Nhận Check-in & Tích Điểm
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Right Side: Result & Explanation */}
              <div className="lg:col-span-5 space-y-6">
                {/* Result Card */}
                {lastResult ? (
                  <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 p-6 shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 className="h-4 w-4" />
                      Check-in Thành Công
                    </div>

                    <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                      {lastResult.customerName}
                    </h3>
                    {lastResult.customerPhone && (
                      <p className="text-xs text-slate-500 font-mono">
                        {lastResult.customerPhone}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 border-t border-emerald-200/60 dark:border-emerald-800/40 pt-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mã khách hàng:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {lastResult.customerCode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Điểm thưởng tích:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{lastResult.pointsAwarded} điểm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tổng điểm mới của khách:</span>
                        <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                          {lastResult.newTotalPoints} pts
                        </span>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-slate-500">Ưu đãi áp dụng:</span>
                        <span className="font-bold text-right text-cyan-700 dark:text-cyan-400 max-w-[200px]">
                          {lastResult.rewardBenefit}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-cyan-200/60 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50/50 via-white to-sky-50/40 dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-900 p-6">
                    <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-black text-sm">
                      <Flame className="h-4 w-4" />
                      Lợi Ích Khi Xác Nhận Check-in
                    </div>
                    <ul className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <strong>Tăng thứ hạng quán:</strong> Mỗi lượt check-in thực tế đẩy quán lên đầu danh sách tìm kiếm & gợi ý cho khách hàng khác.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <strong>Chống gian lận:</strong> Hệ thống tự động giới hạn 1 khách chỉ check-in 1 lần mỗi 2 tiếng tại cùng 1 quán.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <strong>Kích cầu khách quay lại:</strong> Tích điểm Loyalty và tặng voucher khuyến khích khách đến lại vào lần sau.
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* History Table */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    Lịch Sử Check-in Tại Quán
                  </h3>
                  <p className="text-xs text-slate-500">
                    Danh sách các khách hàng đã được xác nhận check-in gần đây
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="rounded-xl text-xs"
                >
                  {loadingHistory ? "Đang tải..." : "Làm mới"}
                </Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold">
                      <th className="pb-3 pl-2">Khách hàng</th>
                      <th className="pb-3">SĐT</th>
                      <th className="pb-3">Ưu đãi / Ghi chú</th>
                      <th className="pb-3">Thời gian</th>
                      <th className="pb-3 text-right pr-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {history.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-400"
                        >
                          Chưa có lượt check-in nào được ghi nhận hôm nay.
                        </td>
                      </tr>
                    ) : (
                      history.slice(0, 20).map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                        >
                          <td className="py-3 pl-2 font-bold text-slate-900 dark:text-white">
                            {item.customerName}
                          </td>
                          <td className="py-3 text-slate-500 font-mono">
                            {item.customerPhone || "-"}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">
                            {item.rewardBenefit || "Check-in thành công"}
                            {item.notes && (
                              <span className="block text-[10px] text-slate-400">
                                ({item.notes})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">
                            {item.checkedInAt
                              ? new Date(item.checkedInAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="py-3 text-right pr-2">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Đã xác nhận
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
