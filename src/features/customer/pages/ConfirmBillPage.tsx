import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CreditCard } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/features/auth";
import {
  confirmBill,
  getCustomerOrderId,
  getCustomerOrders,
  getBill,
  rejectBill,
  requestCashPayment,
} from "@/features/customer/services/orderService";
import { verifyCheckIn } from "@/shared/services/checkInService";

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

function getBankTransferDescription(orderId?: string | null) {
  if (!orderId) return "UGem";
  return `UGem-${orderId}`;
}

function getBankTransferInfo(
  bill: Bill | null,
  orderId: string | null | undefined,
  finalPrice: number,
) {
  const bankName = bill?.bankName ?? "";
  const bankAccount = bill?.bankAccount ?? "";
  const description =
    bill?.description ?? getBankTransferDescription(orderId);
  const amount = Math.round(
    Number(bill?.totalAmount ?? finalPrice ?? 0),
  );
  const qrCode =
    bill?.qrCode ??
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

    Promise.all([getBill(orderId), getCustomerOrders().catch(() => [])])
      .then(async ([billData, orders]) => {
        if (!active) return;

        setError(null);
        setBillConfirmed(billConfirmedFromQr);
        const nextBill = billData as Bill;
        setBill(nextBill);
        setSelectedPaymentMethod(getBillPaymentMethod(nextBill));

        const currentOrder = orders.find(
          (order) => getCustomerOrderId(order) === orderId,
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
        setError("Không thể tải hóa đơn. Vui lòng thử lại.");
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
      const orders = await getCustomerOrders().catch(() => []);

      if (!active) return;

      const currentOrder = orders.find(
        (order) => getCustomerOrderId(order) === orderId,
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
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] px-4 py-8 text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-xl overflow-hidden rounded-[36px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl mix-blend-multiply" />
        <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl mix-blend-multiply" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 ring-1 ring-cyan-500/10">
            Payment & Check-in
          </div>
          <h1 className="mb-6 text-3xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Xác nhận hóa đơn
          </h1>

          {loading && (
            <p className="text-slate-500 font-medium">Đang tải hóa đơn...</p>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200/60 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur">
              {error}
            </div>
          )}

          {!loading && bill && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Mã đơn
                </div>
                <div className="mt-1 break-all font-mono text-[15px] font-black text-cyan-800">
                  {billOrderId}
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3">
                  Món đã gọi
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
                        className="flex items-center justify-between gap-3 border-b border-slate-200/50 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold text-slate-800">
                            {name}
                          </div>
                          <div className="text-[13px] font-medium text-slate-500 mt-0.5">
                            Số lượng:{" "}
                            <span className="font-bold text-slate-700">
                              {quantity}
                            </span>
                          </div>
                          {toppings.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {toppings.map((topping) => (
                                <span
                                  key={topping.id ?? topping.name}
                                  className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                                >
                                  +{topping.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {note ? (
                            <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-100">
                              Ghi chú: {note}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-[15px] font-black text-slate-900">
                          {formatCurrency(subTotal)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200/50 bg-linear-to-r from-cyan-50/80 to-blue-50/80 p-5 shadow-sm">
                <div className="text-[13px] font-black uppercase tracking-[0.18em] text-cyan-800">
                  Tổng thanh toán
                </div>
                <div className="text-2xl font-black text-cyan-700">
                  {formatCurrency(finalPrice)}
                </div>
              </div>

              {!billConfirmed && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBill}
                    className="flex-1 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-3.5 text-[15px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {submitting ? "Đang gửi..." : "Xác nhận hóa đơn"}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReject("Khác")}
                    className="rounded-xl border border-rose-200/60 bg-white/70 px-6 py-3.5 text-[15px] font-bold text-rose-600 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md hover:border-rose-300 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    Từ chối
                  </button>
                </div>
              )}

              {billConfirmed && (
                <>
                  <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2.5 font-bold text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      Hóa đơn đã được xác nhận
                    </div>
                  </div>

                  <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                    <div className="mb-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Phương thức thanh toán
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPaymentMethod("Cash")}
                        disabled={cashRequested}
                        className={`rounded-2xl border p-4 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${
                          selectedPaymentMethod === "Cash"
                            ? "border-amber-300 bg-amber-50 text-amber-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-700 ring-1 ring-amber-100">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="font-black">Tiền mặt</div>
                        <div className="mt-1 text-[12px] font-medium opacity-75">
                          Thanh toán trực tiếp tại quán
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSelectPaymentMethod("BankTransfer")
                        }
                        disabled={cashRequested}
                        className={`rounded-2xl border p-4 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${
                          selectedPaymentMethod === "BankTransfer"
                            ? "border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="font-black">Chuyển khoản</div>
                        <div className="mt-1 text-[12px] font-medium opacity-75">
                          Quét QR ngân hàng để thanh toán
                        </div>
                      </button>
                    </div>
                  </div>

                  {selectedPaymentMethod === "Cash" ? (
                    <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/80 p-4 shadow-sm backdrop-blur">
                      <div className="mb-2 font-bold text-amber-800">
                        Thanh toán tiền mặt
                      </div>
                      <div className="text-[13px] font-medium leading-relaxed text-amber-700/80">
                        Vui lòng thanh toán trực tiếp tại quán. Sau khi đã thanh
                        toán, bấm Đã thanh toán tiền mặt để hoàn tất check-in.
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-cyan-50/80 p-4 shadow-sm backdrop-blur">
                      <div className="mb-3 font-bold text-cyan-900">
                        Thanh toán chuyển khoản
                      </div>
                      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-cyan-100">
                          <img
                            src={bankTransferInfo.qrCode ?? ""}
                            alt="QR chuyển khoản"
                            className="aspect-square w-full rounded-xl object-contain"
                          />
                        </div>
                        <div className="space-y-2 text-[13px] font-semibold text-cyan-900">
                          <div className="flex justify-between gap-3">
                            <span className="text-cyan-700/70">Ngân hàng</span>
                            <span className="text-right">
                              {bankTransferInfo.bankName}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-cyan-700/70">Tài khoản</span>
                            <span className="text-right font-black">
                              {bankTransferInfo.bankAccount}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-cyan-700/70">Số tiền</span>
                            <span className="text-right font-black">
                              {formatCurrency(bankTransferInfo.amount)}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3 ring-1 ring-cyan-100">
                            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-700/70">
                              Nội dung
                            </div>
                            <div className="mt-1 break-all font-mono text-[13px] font-black text-cyan-900">
                              {bankTransferInfo.description}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-[13px] font-medium leading-relaxed text-cyan-800/80">
                        Sau khi chuyển khoản đúng số tiền và nội dung, hệ thống
                        sẽ tự xác nhận thanh toán để hoàn tất check-in.
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {selectedPaymentMethod === "Cash" ? (
                      <button
                        type="button"
                        onClick={handleStartPayment}
                        disabled={submitting || cashRequested}
                        className="flex-1 rounded-xl bg-linear-to-br from-cyan-600 to-blue-600 px-5 py-3.5 text-[15px] font-black text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
                      >
                        {cashRequested
                          ? "Đang chờ merchant xác nhận"
                          : "Đã thanh toán tiền mặt"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-3.5 text-[15px] font-black text-cyan-800 shadow-sm disabled:opacity-80"
                      >
                        Đang chờ xác nhận chuyển khoản
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/customer/orders/${orderId}`)}
                      className="rounded-xl border border-slate-200/60 bg-white/70 px-6 py-3.5 text-[15px] font-bold text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md hover:border-slate-300"
                    >
                      Quay lại
                    </button>
                  </div>

                  {cashRequested && (
                    <div className="mt-8 rounded-2xl border border-cyan-200/60 bg-cyan-50/80 p-4 text-[14px] font-semibold text-cyan-800 shadow-sm backdrop-blur">
                      Đã ghi nhận thanh toán tiền mặt. Đang chờ merchant xác
                      nhận để hoàn tất check-in.
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
