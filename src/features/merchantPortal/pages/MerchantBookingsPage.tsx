import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import {
  getMerchantBookings,
  reviewBooking,
  type Booking,
} from "@/features/booking/services/bookingService";

export default function MerchantBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tabParam = searchParams.get("status");
  const activeTab: "All" | "Pending" | "Accepted" | "Rejected" =
    tabParam === "Pending" || tabParam === "Accepted" || tabParam === "Rejected"
      ? tabParam
      : "All";

  // Rejection modal state
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await getMerchantBookings();
      setBookings(data);
    } catch (err) {
      console.error(err);
      notify.error("Không tải được danh sách đặt bàn.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const handleAccept = async (id: string) => {
    setIsSubmitting(true);
    try {
      await reviewBooking(id, { status: "Accepted" });
      notify.success("Đã chấp nhận yêu cầu đặt bàn.");
      void loadBookings();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.message || "Xử lý thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingBookingId) return;
    if (!rejectionReason.trim()) {
      notify.error("Vui lòng nhập lý do từ chối.");
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewBooking(rejectingBookingId, {
        status: "Rejected",
        rejectionReason: rejectionReason.trim(),
      });
      notify.success("Đã từ chối yêu cầu đặt bàn.");
      setRejectingBookingId(null);
      setRejectionReason("");
      void loadBookings();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.message || "Từ chối thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "Pending") return b.status === "Pending";
    if (activeTab === "Accepted") return b.status === "Accepted";
    if (activeTab === "Rejected") return b.status === "Rejected" || b.status === "Cancelled";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Quản lý Đặt bàn
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Duyệt và quản lý danh sách khách hàng đặt bàn trước
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadBookings()}
          disabled={isLoading}
          variant="outline"
          className="h-10 rounded-2xl border-slate-200 dark:border-white/10 text-xs font-bold gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        {(["All", "Pending", "Accepted", "Rejected"] as const).map((tab) => {
          const labelMap = {
            All: "Tất cả",
            Pending: "Chờ duyệt",
            Accepted: "Đã xác nhận",
            Rejected: "Từ chối / Hủy",
          };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setSearchParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    if (tab === "All") next.delete("status");
                    else next.set("status", tab);
                    return next;
                  },
                  { replace: true },
                );
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                active
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {labelMap[tab]}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
          <p className="mt-3 text-xs font-bold">Đang tải yêu cầu đặt bàn...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-12 text-center shadow-xl backdrop-blur-2xl">
          <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Không có yêu cầu đặt bàn nào
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-xl backdrop-blur-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {b.customer?.user.fullName || "Khách hàng"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {b.customer?.user.email}
                    </p>
                  </div>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3 text-xs">
                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Ngày đến
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(b.bookingAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Giờ đến
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(b.bookingAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase">
                    Số người
                  </span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {b.partySize} người
                  </span>
                </div>
              </div>

              {b.customer?.user.phoneNumber && (
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                  <Phone className="h-3.5 w-3.5 text-cyan-500" />
                  SĐT: {b.customer.user.phoneNumber}
                </p>
              )}

              {b.note && (
                <p className="text-xs italic text-slate-500 dark:text-slate-400 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl">
                  Ghi chú từ khách: "{b.note}"
                </p>
              )}

              {b.rejectionReason && (
                <p className="text-xs font-bold text-rose-500">
                  Lý do từ chối: {b.rejectionReason}
                </p>
              )}

              {/* Actions for Pending */}
              {b.status === "Pending" && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => handleAccept(b.id)}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Chấp nhận
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRejectingBookingId(b.id)}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-2xl border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              Lý do từ chối đặt bàn
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Vui lòng cung cấp lý do để gửi thông báo đến khách hàng.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Quán đã hết bàn vào khung giờ này..."
              className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 p-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 mb-4"
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectingBookingId(null);
                  setRejectionReason("");
                }}
                disabled={isSubmitting}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isSubmitting}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận từ chối"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Accepted":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ĐÃ XÁC NHẬN
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
          TỪ CHỐI
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          ĐÃ HỦY
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
          CHỜ DUYỆT
        </span>
      );
  }
}
