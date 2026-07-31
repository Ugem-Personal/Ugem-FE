import { UserAccountMenu } from "@/shared/components";

export function MerchantHeader() {
  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-white/70 bg-white/72 px-6 shadow-lg shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl lg:px-8">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">
          Merchant workspace
        </p>
        <strong className="mt-1 block truncate text-lg font-black tracking-tight text-slate-950">
          Quản lý hồ sơ quán ăn
        </strong>
      </div>

      <UserAccountMenu fallbackName="Merchant" />
    </header>
  );
}
