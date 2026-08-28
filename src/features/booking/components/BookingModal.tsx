import { useEffect, useState, type FormEvent } from "react";
import { Calendar, Users, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notify";
import { createBooking } from "../services/bookingService";

interface BookingModalProps {
  merchantId: string;
  merchantName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type BookingDraft = {
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  note: string;
};

function getBookingDraft(merchantId: string): BookingDraft {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(`ugem_booking_draft_${merchantId}`) || "null",
    ) as Partial<BookingDraft> | null;

    return {
      bookingDate: typeof saved?.bookingDate === "string" ? saved.bookingDate : "",
      bookingTime: typeof saved?.bookingTime === "string" ? saved.bookingTime : "",
      partySize:
        typeof saved?.partySize === "number" && saved.partySize >= 1
          ? saved.partySize
          : 2,
      note: typeof saved?.note === "string" ? saved.note : "",
    };
  } catch {
    return { bookingDate: "", bookingTime: "", partySize: 2, note: "" };
  }
}

export function BookingModal({
  merchantId,
  merchantName,
  isOpen,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const initialDraft = getBookingDraft(merchantId);
  const [bookingDate, setBookingDate] = useState(initialDraft.bookingDate);
  const [bookingTime, setBookingTime] = useState(initialDraft.bookingTime);
  const [partySize, setPartySize] = useState(initialDraft.partySize);
  const [note, setNote] = useState(initialDraft.note);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const draftKey = `ugem_booking_draft_${merchantId}`;

  useEffect(() => {
    if (!isOpen) return;

    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ bookingDate, bookingTime, partySize, note }),
    );
  }, [bookingDate, bookingTime, draftKey, isOpen, note, partySize]);

  function closeAndDiscardDraft() {
    sessionStorage.removeItem(draftKey);
    onClose();
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!bookingDate || !bookingTime) {
      notify.error("Vui lòng chọn ngày và giờ đặt bàn.");
      return;
    }

    const bookingAt = new Date(`${bookingDate}T${bookingTime}`);

    if (isNaN(bookingAt.getTime()) || bookingAt <= new Date()) {
      notify.error("Thời gian đặt bàn phải ở tương lai.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBooking({
        merchantId,
        bookingAt: bookingAt.toISOString(),
        partySize,
        note: note.trim() || undefined,
      });

      notify.success("Đặt bàn thành công! Nhà hàng sẽ sớm xác nhận.");
      sessionStorage.removeItem(draftKey);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.message || "Đặt bàn thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Đặt bàn trước
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {merchantName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAndDiscardDraft}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Ngày nhận bàn *
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Giờ đến *
              </label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Số lượng người *
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Users className="h-5 w-5" />
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="h-11 flex-1 rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Ghi chú thêm (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cho mình xin bàn gần cửa sổ, chuẩn bị ghế trẻ em..."
              className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/60 p-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={closeAndDiscardDraft}
              disabled={isSubmitting}
              className="h-11 rounded-2xl border-slate-200 dark:border-white/10 text-xs font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Xác nhận đặt bàn
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
