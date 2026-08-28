import { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Store,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import {
  getRebalancingStatus,
  runManualRebalancing,
  type RebalancingStatusData,
} from "@/shared/services/rebalancingService";

export function RebalancingOverview() {
  const [data, setData] = useState<RebalancingStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      setData(await getRebalancingStatus());
    } catch (err: unknown) {
      console.error(err);
      notify.error("Không thể tải thông tin Rebalancing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      await runManualRebalancing();
      notify.success("Đã chạy thành công Rebalancing hệ thống!");
      await fetchStatus();
    } catch (err: unknown) {
      console.error(err);
      notify.error("Kích hoạt Rebalancing thất bại.");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-xl backdrop-blur-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Hệ thống Rebalancing & Ranking (MF4)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tự động tính toán Strength Index (SI), chuẩn hóa Underrated Score
            (US) và cập nhật thứ hạng Visibility định kỳ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchStatus()}
            disabled={isLoading}
            className="h-10 rounded-2xl border-slate-200 dark:border-white/10 text-xs font-bold gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button
            type="button"
            onClick={handleManualTrigger}
            disabled={isTriggering || isLoading}
            className="h-10 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs gap-2 shadow-lg hover:brightness-110"
          >
            {isTriggering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isTriggering
              ? "Đang Rebalance..."
              : "Kích hoạt Rebalance Thủ công"}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Status */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 shadow-xl backdrop-blur-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Trạng thái Rebalance
          </span>
          <div className="flex items-center gap-2">
            {data?.status === "Completed" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED
              </span>
            ) : data?.status === "Running" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> RUNNING
              </span>
            ) : data?.status === "Failed" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> FAILED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" /> IDLE
              </span>
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Lần chạy gần nhất:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {data?.lastUpdatedAt
                ? new Date(data.lastUpdatedAt).toLocaleString("vi-VN")
                : "Chưa từng chạy"}
            </strong>
          </p>
        </div>

        {/* Total Merchants */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 shadow-xl backdrop-blur-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Tổng Quán Đã Xử Lý
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {data?.merchantCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              quán Active
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
            <Store className="h-3.5 w-3.5" /> Áp dụng tính SI & US
          </div>
        </div>

        {/* Increased Visibility */}
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xl backdrop-blur-2xl">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Tăng Visibility (Hạng cao hơn)
          </span>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-500" />
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {data?.increasedVisibility ?? 0}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
            Quán nâng hạng hiển thị
          </p>
        </div>

        {/* Decreased / Unchanged */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 shadow-xl backdrop-blur-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Biến động Visibility
          </span>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 text-rose-500">
              <TrendingDown className="h-4 w-4" /> Giảm:{" "}
              {data?.decreasedVisibility ?? 0}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Minus className="h-4 w-4" /> Giữ nguyên:{" "}
              {data?.unchangedVisibility ?? 0}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Được phân bổ công bằng
          </p>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-xl backdrop-blur-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Bảng Xếp Hạng & Chỉ Số Rebalance Của Quán
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            Read-only Dashboard View
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
            <p className="mt-2 text-xs font-bold">Đang tải bảng xếp hạng...</p>
          </div>
        ) : !data?.merchants || data.merchants.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">
            Chưa có dữ liệu bảng xếp hạng Rebalancing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Hạng (Rank)</th>
                  <th className="py-3 px-4">Tên Quán</th>
                  <th className="py-3 px-4">Đánh giá (Rating)</th>
                  <th className="py-3 px-4">Strength Index (SI)</th>
                  <th className="py-3 px-4">Underrated Score (US)</th>
                  <th className="py-3 px-4">Lần Rebalance Cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {data.merchants.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      #{m.recommendationRank ?? "-"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {m.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                        ★ {m.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {m.strengthIndex.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {m.underratedScore.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {m.lastRebalancedAt
                        ? new Date(m.lastRebalancedAt).toLocaleDateString(
                            "vi-VN",
                          )
                        : "Chưa rebalance"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
