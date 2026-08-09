import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CreditCard, ArrowLeft, Receipt, Copy, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";
import { getCurrentUser } from "@/features/auth";
import { notify } from "@/shared/lib/notify";
import {
  confirmBill,
  getCustomerOrderId,
  getCustomerOrders,
  getBill,
  rejectBill,
  requestCashPayment,
} from "@/features/customer/services/orderService";
import { verifyCheckIn } from "@/shared/services/checkInService";
import { ModeToggle } from "@/shared/components";
import type { CustomerOrderSummary } from "@/shared/types";

type BillItem = {
  name?: string;
  quantity?: number;
  subTotal?: number;
  notes?: string;
  toppings?: {
    id?: string;
    name?: string;
    price?: number;
  }[];
};

type Bill = {
  orderId?: string;
  paymentMethod?: string;
  finalPrice?: number;
  totalAmount?: number;
  bankName?: string;
  bankAccount?: string;
  description?: string;
  qrCode?: string | null;
  items?: BillItem[];
};

const cashPaymentStoragePrefix = "ugem.cash-payment-requested";
type BillPaymentMethod = "Cash" | "BankTransfer";

function getCashPaymentStorageKey(orderId?: string | null) {
  return orderId ? `${cashPaymentStoragePrefix}.${orderId}` : null;
}

function getPersistedCashRequest(orderId?: string | null) {
  const key = getCashPaymentStorageKey(orderId);

  if (!key || typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(key) === "1";
}

function getServerMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  const err = error as any;
  const responseMsg = err.response?.data?.message;
  if (Array.isArray(responseMsg)) return responseMsg.join(", ");
  if (typeof responseMsg === "string" && responseMsg.trim()) return responseMsg;
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function getBillItemName(item: BillItem) {
  return item.name ?? "Món ăn";
}

function getBillItemQuantity(item: BillItem) {
  return item.quantity ?? 0;
}

function getBillItemSubTotal(item: BillItem) {
  return item.subTotal ?? 0;
}

function getBillItemNote(item: BillItem) {
  return item.notes ?? "";
}

function getBillItemToppings(item: BillItem) {
  return item.toppings ?? [];
}

function getBillPaymentMethod(bill?: Bill | null): BillPaymentMethod {
  const paymentMethod = (bill?.paymentMethod ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return paymentMethod.includes("banktransfer") ? "BankTransfer" : "Cash";
}

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toUpperCase();
}

function getBankTransferDescription(
  orderId?: string | null,
  customerName?: string | null,
) {
  if (!orderId) return "UGEM CHUYEN TIEN";
  const user = getCurrentUser();
  const rawName = user?.Name || customerName || "";
  const nameClean = rawName ? removeAccents(rawName) : "";
  const shortId = orderId.split("-")[0].toUpperCase();
  return nameClean
    ? `${nameClean} CHUYEN TIEN DON ${shortId}`
    : `UGEM CHUYEN TIEN DON ${shortId}`;
}

function getBankTransferInfo(
  bill: Bill | null,
  orderId: string | null | undefined,
  finalPrice: number,
) {
  const bankName = bill?.bankName ?? "";
  const bankAccount = bill?.bankAccount ?? "";
  const user = getCurrentUser();
  const currentUserName = user?.Name;
  const orderCustomerName =
    (bill as any)?.customerName ||
    (bill as any)?.order?.customer?.user?.fullName;

  const description = getBankTransferDescription(
    orderId,
    currentUserName || orderCustomerName,
  );

  const amount = Math.round(
    Number(bill?.totalAmount ?? finalPrice ?? 0),
  );
  const qrCode =
    `https://qr.sepay.vn/img?acc=${encodeURIComponent(
      bankAccount,
    )}&bank=${encodeURIComponent(bankName)}&amount=${amount}&des=${encodeURIComponent(
      description,
    )}&template=qronly`;

  return {
    bankName,
    bankAccount,
    description,
    amount,
    qrCode,
  };
}

export default function ConfirmBillPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const handleBack = useSafeBack(
    orderId ? `/customer/orders/${orderId}` : "/customer/orders",
  );
  const checkInToken = searchParams.get("checkInToken");
  const billConfirmedFromQr = searchParams.get("billConfirmed") === "1";

  const [loading, setLoading] = useState<boolean>(!!orderId);
  const [error, setError] = useState<string | null>(
    orderId ? null : "Mã đơn hàng không hợp lệ.",
  );
  const [bill, setBill] = useState<Bill | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [billConfirmed, setBillConfirmed] = useState(billConfirmedFromQr);
  const [cashRequested, setCashRequested] = useState(() =>
    getPersistedCashRequest(orderId),
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<BillPaymentMethod>("Cash");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, field: string) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    notify.success(
      `Đã sao chép ${field === "account" ? "Số tài khoản" : "Nội dung chuyển khoản"}!`,
    );
    setTimeout(() => setCopiedField(null), 2000);
  }

  const billOrderId = bill?.orderId ?? orderId;
  const finalPrice = bill?.finalPrice ?? 0;
  const items = useMemo(() => bill?.items ?? [], [bill]);
  const bankTransferInfo = useMemo(
    () => getBankTransferInfo(bill, billOrderId, finalPrice),
    [bill, billOrderId, finalPrice],
  );

  const finishCheckIn = useCallback(async () => {
    if (orderId && checkInToken) {
      await verifyCheckIn({ orderId, checkInToken });
    }

    navigate("/check-in?success=1", { replace: true });
  }, [checkInToken, navigate, orderId]);

  useEffect(() => {
    if (!orderId) return;

    const user = getCurrentUser();
    if (!user) {
      const returnUrl = encodeURIComponent(
        `/orders/confirm?orderId=${orderId}${
          checkInToken
            ? `&checkInToken=${encodeURIComponent(checkInToken)}`
            : ""
        }`,
      );
      navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
      return;
    }

    let active = true;

    Promise.all([
      getBill(orderId),
      getCustomerOrders().catch(() => ({ data: [] })),
    ])
      .then(async ([billData, ordersRes]) => {
        if (!active) return;
        const orders = ordersRes.data ?? [];

        setError(null);
        setBillConfirmed(billConfirmedFromQr);
        const nextBill = billData as Bill;
        setBill(nextBill);
        setSelectedPaymentMethod(getBillPaymentMethod(nextBill));

        const currentOrder = orders.find(
          (order: CustomerOrderSummary) => getCustomerOrderId(order) === orderId,
        );
        const currentStatus = currentOrder?.status?.trim().toLowerCase() ?? "";
        const persistedCashRequest = getPersistedCashRequest(orderId);

        if (currentStatus === "completed") {
          const cashPaymentKey = getCashPaymentStorageKey(orderId);

          if (cashPaymentKey && typeof window !== "undefined") {
            window.localStorage.removeItem(cashPaymentKey);
          }

          await finishCheckIn();
          return;
        }

        if (currentStatus === "cashpending") {
          setBillConfirmed(true);
          setSelectedPaymentMethod("Cash");
          setCashRequested(true);
          return;
        }

        if (currentStatus === "billconfirmed") {
          setBillConfirmed(true);
          setCashRequested(persistedCashRequest);
          return;
        }

        setCashRequested(persistedCashRequest);
      })
      .catch((err) => {
        console.error(err);
        if (!active) return;
        setError(getServerMessage(err, "Không thể tải hóa đơn. Vui lòng thử lại."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [billConfirmedFromQr, checkInToken, finishCheckIn, orderId, navigate]);

  useEffect(() => {
    const cashPaymentKey = getCashPaymentStorageKey(orderId);

    if (!cashPaymentKey || typeof window === "undefined") {
      return;
    }

    if (cashRequested) {
      window.localStorage.setItem(cashPaymentKey, "1");
      return;
    }

    window.localStorage.removeItem(cashPaymentKey);
  }, [cashRequested, orderId]);

  useEffect(() => {
    const shouldSyncPayment =
      cashRequested ||
      (billConfirmed && selectedPaymentMethod === "BankTransfer");

    if (!orderId || !shouldSyncPayment) return;

    let active = true;
    const timerId = window.setInterval(() => {
      void syncCashPaymentStatus();
    }, 4000);

    async function syncCashPaymentStatus() {
      const ordersRes = await getCustomerOrders().catch(() => ({ data: [] }));
      const orders = ordersRes.data ?? [];

      if (!active) return;

      const currentOrder = orders.find(
        (order: CustomerOrderSummary) => getCustomerOrderId(order) === orderId,
      );
      const currentStatus = currentOrder?.status?.trim().toLowerCase() ?? "";

      if (currentStatus === "completed") {
        const cashPaymentKey = getCashPaymentStorageKey(orderId);

        if (cashPaymentKey && typeof window !== "undefined") {
          window.localStorage.removeItem(cashPaymentKey);
        }

        await finishCheckIn();
        return;
      }

      if (
        selectedPaymentMethod === "BankTransfer" &&
        (!currentStatus || currentStatus === "billconfirmed")
      ) {
        return;
      }

      if (selectedPaymentMethod === "BankTransfer") {
        setError(
          "Trạng thái thanh toán chuyển khoản đã thay đổi. Vui lòng tải lại hóa đơn.",
        );
        return;
      }

      if (!currentStatus || currentStatus === "cashpending") {
        return;
      }

      const cashPaymentKey = getCashPaymentStorageKey(orderId);

      if (cashPaymentKey && typeof window !== "undefined") {
        window.localStorage.removeItem(cashPaymentKey);
      }

      setCashRequested(false);
      setError(
        "Đơn tiền mặt đã thay đổi trạng thái. Vui lòng tải lại hóa đơn.",
      );
    }

    void syncCashPaymentStatus();

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [
    billConfirmed,
    cashRequested,
    finishCheckIn,
    navigate,
    orderId,
    selectedPaymentMethod,
  ]);

  async function handleConfirmBill() {
    if (!orderId) return;

    setSubmitting(true);
    setError(null);
    setCashRequested(false);

    try {
      await confirmBill(orderId);
      setBillConfirmed(true);
    } catch (err) {
      console.error(err);
      setBillConfirmed(false);
      setError(
        getServerMessage(err, "Xác nhận hóa đơn thất bại. Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartPayment() {
    setError(null);
    void handleCashPaymentRequested();
  }

  function handleSelectPaymentMethod(method: BillPaymentMethod) {
    if (cashRequested) return;

    setError(null);
    setSelectedPaymentMethod(method);
  }

  async function handleCashPaymentRequested() {
    if (!orderId) return;
    if (cashRequested) return;

    setSubmitting(true);
    setError(null);

    try {
      await requestCashPayment(orderId);
      setCashRequested(true);
    } catch (err) {
      console.error(err);
      setError(
        getServerMessage(
          err,
          "Không thể gửi yêu cầu xác nhận tiền mặt. Vui lòng thử lại.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason?: string) {
    if (!orderId) return;

    setSubmitting(true);
    setError(null);

    try {
      await rejectBill(orderId, reason ?? "");
      navigate(`/customer/orders/${orderId}`);
    } catch (err) {
      console.error(err);
      setError(
        getServerMessage(err, "Từ chối hóa đơn thất bại. Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 px-4 py-8">
      {/* Glow Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative mx-auto max-w-xl">
        {/* Top Navbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <ModeToggle />
        </div>

        {/* Digital Receipt Container */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            <Receipt className="h-3.5 w-3.5" /> Digital Bill & Payment Confirmation
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Xác nhận hóa đơn
          </h1>

          {loading && (
            <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
              Đang tải thông tin hóa đơn...
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}

          {!loading && bill && (
            <section className="mt-6 space-y-6">
              {/* Receipt Header Card */}
              <div className="rounded-2xl border border-slate-900 dark:border-white/10 bg-slate-950 dark:bg-slate-900 p-5 text-white shadow-lg relative overflow-hidden">
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  Mã đơn hàng
                </div>
                <div className="mt-1 break-all font-mono text-sm sm:text-base font-black tracking-wide text-cyan-200">
                  #{billOrderId}
                </div>
              </div>

              {/* Order Items List */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 p-5">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  Danh sách món ăn ({items.length})
                </div>
                <ul className="space-y-3">
                  {items.map((item, idx) => {
                    const name = getBillItemName(item);
                    const quantity = getBillItemQuantity(item);
                    const subTotal = getBillItemSubTotal(item);
                    const note = getBillItemNote(item);
                    const toppings = getBillItemToppings(item);

                    return (
                      <li
                        key={`${name}-${idx}`}
                        className="flex items-start justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-950 dark:text-white">
                            {name}
                          </div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Số lượng: <span className="font-black text-slate-800 dark:text-slate-200">{quantity}</span>
                          </div>
                          {toppings.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {toppings.map((topping) => (
                                <span
                                  key={topping.id ?? topping.name}
                                  className="rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300"
                                >
                                  +{topping.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {note ? (
                            <div className="mt-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/40 px-2.5 py-1 text-[11px] font-medium text-amber-900 dark:text-amber-200">
                              Ghi chú: {note}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-sm font-black text-cyan-600 dark:text-cyan-400 font-mono">
                          {formatCurrency(subTotal)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Total Amount Box */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/60 dark:to-slate-900 p-5 shadow-xs">
                <div className="text-xs font-black uppercase tracking-widest text-cyan-900 dark:text-cyan-200">
                  Tổng cần thanh toán
                </div>
                <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {formatCurrency(finalPrice)}
                </div>
              </div>

              {/* Actions Before Confirmation */}
              {!billConfirmed && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBill}
                    className="flex-1 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-5 py-3.5 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition disabled:opacity-50"
                  >
                    {submitting ? "Đang xử lý..." : "Xác nhận hóa đơn"}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReject("Khác")}
                    className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/40 px-6 py-3.5 text-xs font-bold text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              )}

              {/* Bill Confirmed View & Payment Selection */}
              {billConfirmed && (
                <>
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      Hóa đơn đã được xác nhận thành công
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Chọn phương thức thanh toán
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPaymentMethod("Cash")}
                        disabled={cashRequested}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectedPaymentMethod === "Cash"
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200"
                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-black">Tiền mặt</div>
                        <div className="mt-1 text-[11px] font-medium opacity-80">
                          Thanh toán trực tiếp tại quán
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPaymentMethod("BankTransfer")}
                        disabled={cashRequested}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectedPaymentMethod === "BankTransfer"
                            ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200"
                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-black">Chuyển khoản</div>
                        <div className="mt-1 text-[11px] font-medium opacity-80">
                          Quét mã QR Ngân hàng (SePay)
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Details Card */}
                  {selectedPaymentMethod === "Cash" ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-xs">
                      <div className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                        Thanh toán tiền mặt
                      </div>
                      <p className="font-medium text-amber-800 dark:text-amber-300/80 leading-relaxed">
                        Vui lòng gửi tiền mặt trực tiếp cho nhân viên quán. Sau khi đã thanh toán, bấm nút Đã thanh toán tiền mặt bên dưới.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/80 dark:bg-cyan-950/40 p-4 text-xs space-y-4">
                      <div className="font-bold text-cyan-900 dark:text-cyan-200">
                        Thanh toán qua mã QR Ngân hàng
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
                          <img
                            src={bankTransferInfo.qrCode ?? ""}
                            alt="Mã QR chuyển khoản"
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="space-y-2 text-xs font-semibold text-cyan-950 dark:text-cyan-100 flex-1 w-full">
                          <div className="flex justify-between items-center border-b border-cyan-200/50 dark:border-cyan-800/50 pb-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Ngân hàng</span>
                            <span className="font-bold">{bankTransferInfo.bankName}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-cyan-200/50 dark:border-cyan-800/50 pb-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Số tài khoản</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm">{bankTransferInfo.bankAccount}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(bankTransferInfo.bankAccount, "account")}
                                className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300 transition"
                                title="Sao chép số tài khoản"
                              >
                                {copiedField === "account" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedField === "account" ? "Đã chép" : "Sao chép"}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-cyan-200/50 dark:border-cyan-800/50 pb-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Số tiền</span>
                            <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                              {formatCurrency(bankTransferInfo.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400">Nội dung</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 dark:text-white">
                                {bankTransferInfo.description}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(bankTransferInfo.description, "description")}
                                className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300 transition"
                                title="Sao chép nội dung chuyển khoản"
                              >
                                {copiedField === "description" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedField === "description" ? "Đã chép" : "Sao chép"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Submission Button */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {selectedPaymentMethod === "Cash" ? (
                      <button
                        type="button"
                        onClick={handleStartPayment}
                        disabled={submitting || cashRequested}
                        className="flex-1 rounded-2xl bg-slate-950 dark:bg-cyan-500 px-5 py-3.5 text-xs font-black text-white dark:text-slate-950 shadow-md hover:bg-cyan-600 dark:hover:bg-cyan-400 transition disabled:opacity-50"
                      >
                        {cashRequested
                          ? "Đang chờ merchant xác nhận tiền mặt"
                          : "Đã thanh toán tiền mặt"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3.5 text-xs font-black text-cyan-700 dark:text-cyan-300"
                      >
                        Đang chờ hệ thống tự động xác nhận chuyển khoản
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
