import {
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

export function PartnerBenefitCard() {
  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-700 p-6 text-center text-white shadow-xl shadow-cyan-500/20">
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative z-10">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md shadow-inner mb-3">
              <Sparkles className="h-6 w-6 text-cyan-200 animate-pulse" />
            </div>
            <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider text-cyan-100">
              UGem Partnership
            </span>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              Safe & Quality Meals
            </h4>
            <p className="mt-1 text-[11px] text-cyan-100/90 leading-relaxed font-medium">
              Nâng tầm thương hiệu ẩm thực của bạn cùng cộng đồng UGem.
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Vì sao chọn đối tác UGem?
          </h3>
        </div>

        {/* Benefits List */}
        <ul className="mt-4 space-y-3.5">
          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 p-3 transition hover:border-cyan-400/40">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Tăng độ nhận diện thương hiệu
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Quán “trong hẻm” tiếp cận hàng ngàn thực khách mỗi ngày.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 p-3 transition hover:border-indigo-400/40">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Cộng đồng Foodie thực tế
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Đánh giá khách quan từ những Reviewer uy tín.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 p-3 transition hover:border-emerald-400/40">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Hỗ trợ Marketing 0đ
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Được ưu tiên xuất hiện trong các chiến dịch nổi bật.
              </p>
            </div>
          </li>
        </ul>

        <Link to="/merchant/support" className="mt-6 flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent p-4 transition hover:border-cyan-500/60">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500 text-slate-950 shadow-md">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Trung tâm hỗ trợ
              </span>
              <strong className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                Xem hướng dẫn và gửi yêu cầu
              </strong>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
