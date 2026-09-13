import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  QrCode,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import logoUrl from "@/assets/ugem-logo.png";

interface TableQrGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  merchantName: string;
  merchantAddress?: string;
}

const DEFAULT_TABLES = [
  "Bàn 01",
  "Bàn 02",
  "Bàn 03",
  "Bàn 04",
  "Bàn 05",
  "Bàn 06",
  "Bàn 07",
  "Bàn 08",
  "Bàn 09",
  "Bàn 10",
  "Bàn VIP",
  "Mang đi (Takeaway)",
];

export function TableQrGeneratorModal({
  open,
  onOpenChange,
  merchantId,
  merchantName,
  merchantAddress,
}: TableQrGeneratorModalProps) {
  const [selectedTable, setSelectedTable] = useState<string>("Bàn 01");
  const [customTable, setCustomTable] = useState<string>("");

  const activeTableName = customTable.trim() || selectedTable;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const checkInUrl = baseUrl + "/check-in?merchantId=" + encodeURIComponent(merchantId) + "&table=" + encodeURIComponent(activeTableName);

  const qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(checkInUrl) + "&bgcolor=ffffff&color=090d16&margin=1";

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <QrCode className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-widest font-mono">
              UFind Smart POS
            </span>
          </div>
          <DialogTitle className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
            Tạo & In Mã QR Bàn Ăn
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            In thẻ mã QR đặt trên bàn để thực khách quét gọi món và xác thực GPS Check-in nhận ưu đãi.
          </DialogDescription>
        </DialogHeader>

        {/* Table Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Chọn vị trí bàn ăn:
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TABLES.map((table) => {
              const active = selectedTable === table && !customTable.trim();
              return (
                <button
                  key={table}
                  type="button"
                  onClick={() => {
                    setSelectedTable(table);
                    setCustomTable("");
                  }}
                  className={"rounded-xl px-3 py-1.5 text-xs font-black transition " + (
                    active
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {table}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={customTable}
              onChange={(e) => setCustomTable(e.target.value)}
              placeholder="Hoặc nhập tên bàn tuỳ chỉnh (Ví dụ: Tầng 2 - Bàn 12)..."
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Printable Stand Card Preview */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-cyan-500/40 bg-gradient-to-b from-cyan-50/50 via-white to-slate-50 p-6 text-center shadow-inner dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 print:border-none print:shadow-none print:p-0">
          <div className="mx-auto max-w-xs space-y-4">
            {/* Header with Logo */}
            <div className="flex items-center justify-center gap-2">
              <img src={logoUrl} alt="UFind" className="h-8 w-auto" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {merchantName}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 truncate max-w-[180px]">
                  {merchantAddress || "Quán Ăn Đối Tác UFind"}
                </p>
              </div>
            </div>

            {/* Table Badge */}
            <div className="inline-block rounded-full bg-slate-950 px-5 py-1 text-sm font-black text-cyan-400 shadow-md ring-2 ring-cyan-400/30">
              📍 {activeTableName}
            </div>

            {/* QR Code Container */}
            <div className="relative mx-auto w-48 h-48 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-900/10 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt={"Mã QR " + activeTableName}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Instructions & Features */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-black text-slate-950 dark:text-white">
                QUÉT MÃ ĐỂ GỌI MÓN & NHẬN ƯU ĐÃI
              </p>
              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Menu Điện Tử
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  <ShieldCheck className="h-3 w-3" /> GPS ≤ 100m
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" /> Tích Điểm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            💡 Khuyên dùng: In khổ A6 hoặc A5 ép plastic đặt tại bàn.
          </p>
          <div className="flex items-center gap-2">
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
              <Printer className="h-4 w-4" /> In mã QR bàn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
