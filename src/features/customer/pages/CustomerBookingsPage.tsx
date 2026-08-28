import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  XCircle,
  Loader2,
  Store,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
import { Button } from "@/shared/components/ui/button";
import { UserAccountMenu } from "@/shared/components";
import { notify } from "@/shared/lib/notify";
import logoUrl from "@/assets/ugem-logo.png";
import {
  cancelBooking,
  getMyBookings,
  type Booking,
} from "@/features/booking/services/bookingService";

export default function CustomerBookingsPage() {
  const safeBack = useSafeBack("/customer");
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await getMyBookings();
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

  const handleCancel = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy yêu cầu đặt bàn này?"))
      return;

    setCancellingId(id);
    try {
      await cancelBooking(id);
      notify.success("Đã hủy đặt bàn thành công.");
      void loadBookings();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.message || "Hủy đặt bàn thất bại.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 dark:bg-amber-600/15 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs transition-colors duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/customer" className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="UGem"
              className="h-10 w-auto transition-transform hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button
              asChild
              type="button"
              variant="outline"
              className="h-11 gap-2 rounded-xl border-rose-200 dark:border-rose-400/30 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 shadow-sm transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <Link to="/customer/wishlist">
                <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                <span className="hidden md:inline">Quán yêu thích</span>
              </Link>
            </Button>

            <Button
              asChild
              type="button"
              className="h-11 gap-2 rounded-xl bg-slate-900 dark:bg-cyan-500 px-4 sm:px-5 text-xs sm:text-sm font-black text-white dark:text-slate-950 shadow-md transition hover:bg-slate-800 dark:hover:bg-cyan-400"
            >
              <Link to="/customer/orders">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Đơn hàng của tôi</span>
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              aria-label="Xem lịch sử đặt bàn"
              className="h-11 gap-2 rounded-xl border-cyan-200 dark:border-cyan-400/30 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 shadow-sm transition hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
            >
              <Link to="/customer/bookings">
                <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Lịch đặt bàn</span>
              </Link>
            </Button>

            <UserAccountMenu fallbackName="Customer" />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={safeBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Lịch sử đặt bàn
          </h1>
          <div className="w-20" />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
            <p className="mt-3 text-xs font-bold">
              Đang tải danh sách đặt bàn...
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-12 text-center shadow-xl backdrop-blur-2xl">
            <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Bạn chưa có lịch đặt bàn nào
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Khám phá ngay các nhà hàng nổi bật và đặt bàn trực tuyến!
            </p>
            <Button
              type="button"
              onClick={() => navigate("/customer")}
              className="mt-6 h-11 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-6"
            >
              Khám phá ngay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-6 shadow-xl backdrop-blur-2xl transition hover:border-cyan-500/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {b.merchant?.name || "Nhà hàng"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {b.merchant?.address}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1">
                          <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                          {new Date(b.bookingAt).toLocaleDateString("vi-VN")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1">
                          <Clock className="h-3.5 w-3.5 text-cyan-500" />
                          {new Date(b.bookingAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1">
                          <Users className="h-3.5 w-3.5 text-cyan-500" />
                          {b.partySize} người
                        </span>
                      </div>

                      {b.note && (
                        <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                          Ghi chú: "{b.note}"
                        </p>
                      )}

                      {b.rejectionReason && (
                        <p className="mt-2 text-xs font-bold text-rose-500">
                          Lý do từ chối: {b.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                    <BookingStatusBadge status={b.status} />

                    {b.status === "Pending" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="h-9 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/10"
                      >
                        {cancellingId === b.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                        )}
                        Hủy đặt bàn
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Accepted":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ĐÃ XÁC NHẬN
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
          TỪ CHỐI
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-3.5 py-1 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          ĐÃ HỦY
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
          HOÀN THÀNH
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
          CHỜ XÁC NHẬN
        </span>
      );
  }
}
