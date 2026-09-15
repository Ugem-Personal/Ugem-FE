import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";
import type { MerchantOrderSummary } from "@/shared/types";

interface MerchantBillPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MerchantOrderSummary | null;
  orderDetail?: any;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankTransferEnabled?: boolean;
}

function formatCurrency(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value?: string | null) {
  if (!value) return new Date().toLocaleString("vi-VN");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function MerchantBillPrintModal({
  open,
  onOpenChange,
  order,
  orderDetail,
  merchantName = "Nhà Hàng UGem",
  merchantAddress,
  merchantPhone,
  bankCode,
  bankAccountNumber,
  bankAccountName,
  bankTransferEnabled,
}: MerchantBillPrintModalProps) {
  if (!order) return null;

  const shortCode = order.orderId.split("-")[0]?.toUpperCase() || order.orderId;
  const transferContent = `THANH TOAN DON ${shortCode}`;
  const amount = Math.round(Number(order.finalPrice ?? 0));
  const hasBankTransfer =
    bankTransferEnabled && Boolean(bankCode) && Boolean(bankAccountNumber);

  const qrImageUrl = hasBankTransfer
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(
        bankAccountNumber!,
      )}&bank=${encodeURIComponent(bankCode!)}&amount=${amount}&des=${encodeURIComponent(
        transferContent,
      )}&template=qronly`
    : null;

  const items = orderDetail?.foods ?? [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-auto max-h-[90vh] rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-lg font-black text-slate-950 dark:text-white flex items-center justify-between">
            <span>Hóa Đơn Thanh Toán</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Xem trước và in phiếu thanh toán cho khách hàng.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Bill Paper */}
        <div className="bill-print-area mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-inner font-mono text-xs print:border-none print:shadow-none print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-950">
              {merchantName}
            </h2>
            {merchantAddress && (
              <p className="mt-1 text-[11px] text-slate-600 leading-tight">
                {merchantAddress}
              </p>
            )}
            {merchantPhone && (
              <p className="mt-0.5 text-[11px] text-slate-600">
                Hotline: {merchantPhone}
              </p>
            )}
            <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-[10px] font-bold text-slate-700">
              PHIẾU THANH TOÁN
            </div>
          </div>

          {/* Order Info */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã đơn hàng:</span>
              <span className="font-bold text-slate-950">#{shortCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian:</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng:</span>
              <span className="font-semibold">{order.customerName || "Khách tại bàn"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hình thức:</span>
              <span className="font-semibold">
                {order.orderType?.toLowerCase() === "offline"
                  ? "Dùng tại quán"
                  : "Giao hàng tận nơi"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phương thức TT:</span>
              <span className="font-semibold">
                {order.paymentMethod === "BankTransfer"
                  ? "Chuyển khoản ngân hàng"
                  : order.paymentMethod === "Cash"
                  ? "Tiền mặt"
                  : order.paymentMethod || "Tiền mặt"}
              </span>
            </div>
          </div>

          {/* Items List */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="pb-1 text-left font-bold">Món</th>
                  <th className="pb-1 text-center font-bold">SL</th>
                  <th className="pb-1 text-right font-bold">Đ.Giá</th>
                  <th className="pb-1 text-right font-bold">T.Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {items.length > 0 ? (
                  items.map((item: any, idx: number) => {
                    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                    const quantity = Number(item.quantity ?? 1);
                    const lineTotal = Number(item.lineTotal ?? unitPrice * quantity);
                    return (
                      <tr key={idx} className="align-top">
                        <td className="py-1.5 pr-2 font-medium">
                          <div>{item.name || item.foodNameSnapshot || "Món ăn"}</div>
                          {item.toppings?.length > 0 && (
                            <div className="text-[9px] text-slate-500">
                              + {item.toppings.map((t: any) => t.name || t.toppingNameSnapshot).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-1 text-center">{quantity}</td>
                        <td className="py-1.5 px-1 text-right text-slate-600">
                          {formatCurrency(unitPrice)}
                        </td>
                        <td className="py-1.5 pl-2 text-right font-bold text-slate-950">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-slate-400">
                      Chi tiết món ăn #{shortCode}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính:</span>
              <span>{formatCurrency(order.finalPrice)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-xs font-black uppercase text-slate-950">
                Tổng thanh toán:
              </span>
              <span className="text-sm font-black text-slate-950">
                {formatCurrency(order.finalPrice)}
              </span>
            </div>
          </div>

          {/* QR Payment info if bank transfer enabled */}
          {hasBankTransfer && qrImageUrl && (
            <div className="pt-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Quét mã VietQR chuyển khoản
              </p>
              <div className="mx-auto w-32 h-32 bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt="Mã VietQR thanh toán"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-2 space-y-0.5 text-[10px] text-slate-600">
                <p>
                  Ngân hàng: <strong className="text-slate-950">{bankCode}</strong>
                </p>
                <p>
                  Số TK: <strong className="text-slate-950">{bankAccountNumber}</strong>
                </p>
                {bankAccountName && (
                  <p>
                    Chủ TK: <strong className="text-slate-950">{bankAccountName}</strong>
                  </p>
                )}
                <p>
                  Nội dung: <strong className="text-slate-950">{transferContent}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Footer message */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500 space-y-0.5">
            <p className="font-semibold">Cảm ơn quý khách và hẹn gặp lại!</p>
            <p className="text-[9px] text-slate-400">Powered by UFind Smart Order</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-end gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 rounded-xl bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400"
          >
            <Printer className="h-4 w-4" /> In hóa đơn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
