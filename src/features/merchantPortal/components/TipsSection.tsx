import { BadgeCheck, ShieldCheck } from "lucide-react";

export function TipsSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 transition-colors duration-200">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            Mẹo chuẩn bị hồ sơ
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Hãy chụp những bức ảnh chân thực nhất về món ăn và không gian. UGem
            đánh giá cao sự mộc mạc và chất lượng cốt lõi.
          </p>
        </div>
      </article>

      <article className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 transition-colors duration-200">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            Tiêu chí thẩm định
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Đội ngũ thẩm định sẽ chấm điểm dựa trên chất lượng món ăn, độ đảm bảo
            trải nghiệm khách quan và tính đặc trưng.
          </p>
        </div>
      </article>
    </section>
  );
}
