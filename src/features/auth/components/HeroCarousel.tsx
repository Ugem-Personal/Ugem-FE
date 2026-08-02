import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";

import discoveryImage from "@/assets/auth/ugem-login-hero.jpg";
import insightsImage from "@/assets/auth/ugem-login-insights.jpg";
import merchantImage from "@/assets/auth/ugem-login-merchant.jpg";
import securityImage from "@/assets/auth/ugem-login-security.jpg";

type Props = {
  images: string[];
  intervalMs?: number;
  onChange?: (...args: [number]) => void;
};

const STORIES = [
  {
    image: discoveryImage,
    alt: "Không gian quán ăn Việt Nam ấm cúng vào buổi tối",
    eyebrow: "Khám phá có chọn lọc",
    title: "Mỗi quán nhỏ đều có một câu chuyện đáng được tìm thấy.",
    description:
      "UGem kết nối thực khách với những địa điểm địa phương chất lượng, ngay khi họ cần một gợi ý đáng tin cậy.",
    icon: MapPin,
  },
  {
    image: merchantImage,
    alt: "Đội ngũ nhà hàng Việt Nam chuẩn bị phục vụ buổi tối",
    eyebrow: "Vận hành liền mạch",
    title: "Một workspace gọn gàng cho chủ quán hiện đại.",
    description:
      "Quản lý hồ sơ, thực đơn, đơn hàng và chiến dịch trong cùng một trải nghiệm nhất quán.",
    icon: Store,
  },
  {
    image: insightsImage,
    alt: "Chủ quán theo dõi dữ liệu kinh doanh bên bàn món Việt",
    eyebrow: "Tăng trưởng minh bạch",
    title: "Dữ liệu đủ rõ để đưa ra quyết định tốt hơn.",
    description:
      "Theo dõi hiệu quả kinh doanh và giữ mọi quy trình nhất quán từ đầu đến cuối.",
    icon: TrendingUp,
  },
  {
    image: securityImage,
    alt: "Đội ngũ nhà hàng kiểm tra vận hành an toàn cuối ngày",
    eyebrow: "An tâm sử dụng",
    title: "Bảo mật và phân quyền ngay từ nền tảng.",
    description:
      "Mỗi vai trò có đúng công cụ cần thiết, không thừa thao tác và không lẫn luồng.",
    icon: ShieldCheck,
  },
];

export function HeroCarousel({ images, intervalMs = 7000, onChange }: Props) {
  const storyCount = Math.max(1, Math.min(images.length || 1, STORIES.length));
  const stories = useMemo(() => STORIES.slice(0, storyCount), [storyCount]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (paused || reduceMotion || stories.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % stories.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, paused, stories.length]);

  useEffect(() => {
    onChange?.(index);
  }, [index, onChange]);

  function go(nextIndex: number) {
    setIndex((nextIndex + stories.length) % stories.length);
  }

  const story = stories[index] ?? STORIES[0];
  const StoryIcon = story.icon;

  return (
    <section className="relative flex h-full min-h-[38rem] w-full flex-col overflow-hidden rounded-[28px] bg-slate-950 p-8 text-white shadow-[0_28px_80px_rgba(2,12,27,0.22)] xl:p-11">
      <div className="absolute inset-0" aria-live="polite">
        {stories.map((item, storyIndex) => (
          <img
            key={item.image}
            src={item.image}
            alt={storyIndex === index ? item.alt : ""}
            aria-hidden={storyIndex !== index}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
              storyIndex === index
                ? "scale-100 opacity-100"
                : "scale-[1.025] opacity-0"
            }`}
            fetchPriority={storyIndex === 0 ? "high" : "auto"}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,27,0.94)_0%,rgba(2,12,27,0.72)_36%,rgba(2,12,27,0.12)_78%),linear-gradient(0deg,rgba(2,12,27,0.82)_0%,transparent_48%)]" />

      <header className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-slate-950/35 py-2 pl-2 pr-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-300 text-slate-950">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          UGem Experience
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {stories.map((_, storyIndex) => (
            <span
              key={storyIndex}
              className={
                storyIndex === index
                  ? "h-1.5 w-7 rounded-full bg-cyan-300"
                  : "h-1.5 w-1.5 rounded-full bg-white/35"
              }
            />
          ))}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-end py-10 xl:py-14">
        <div key={index} className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/35 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-cyan-100 backdrop-blur-md">
            <StoryIcon className="h-3.5 w-3.5" />
            {story.eyebrow}
          </span>
          <h2 className="editorial-heading mt-5 max-w-xl text-4xl font-black leading-[1.07] text-white 2xl:text-5xl">
            {story.title}
          </h2>
          <p className="mt-5 max-w-lg text-base font-medium leading-7 text-slate-200">
            {story.description}
          </p>
        </div>
      </div>

      {stories.length > 1 ? (
        <footer className="relative z-20 flex items-center justify-between border-t border-white/15 pt-5">
          <p className="text-xs font-semibold text-slate-300">
            Khám phá · Vận hành · Tăng trưởng
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} aria-label="Nội dung trước" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu"} aria-pressed={paused} className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Nội dung tiếp theo" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

export default HeroCarousel;
