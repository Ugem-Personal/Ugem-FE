type Step = {
  number: number;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: 1,
    title: "Gửi thông tin quán",
    description: "Merchant điền thông tin cơ bản và hình ảnh về quán.",
  },
  {
    number: 2,
    title: "Staff xét duyệt",
    description: "Đội ngũ UGem kiểm tra thông tin, món ăn và tính xác thực của quán.",
  },
  {
    number: 3,
    title: "Kích hoạt quán",
    description: "Hồ sơ được duyệt và quán chính thức sẵn sàng hoạt động trên UGem.",
  },
];

export function OnboardingSteps() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white">
          Quy trình đưa quán lên UGem
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          Đơn giản, minh bạch và đảm bảo chất lượng thẩm định.
        </p>
      </div>

      {/* Desktop Stepper Horizontal */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 relative">
        {steps.map((step, idx) => (
          <div key={step.number} className="relative flex flex-col items-start p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50">
            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div className="absolute top-8 left-[calc(100%-8px)] w-4 h-[2px] bg-slate-300 dark:bg-slate-700 z-10 pointer-events-none" />
            )}

            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-black">
                {step.number}
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                Bước 0{step.number}
              </span>
            </div>

            <h3 className="text-sm font-black text-slate-950 dark:text-white">
              {step.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile / Tablet Vertical Stepper */}
      <div className="lg:hidden space-y-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-black">
              {step.number}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Bước 0{step.number}</span>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  {step.title}
                </h3>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
