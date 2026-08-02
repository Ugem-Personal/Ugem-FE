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

export function HeroCarousel({ images, intervalMs = 4000, onChange }: Props) {
  const storyCount = Math.max(1, Math.min(images.length || 1, STORIES.length));
  const stories = useMemo(() => STORIES.slice(0, storyCount), [storyCount]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Continuous auto-slide timer
  useEffect(() => {
    if (paused || stories.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % stories.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [index, intervalMs, paused, stories.length]);

  useEffect(() => {
    onChange?.(index);
  }, [index, onChange]);

  function go(nextIndex: number) {
    setIndex((nextIndex + stories.length) % stories.length);
  }

  const story = stories[index] ?? STORIES[0];
  const StoryIcon = story.icon;

  return (
    <section className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[24px] bg-slate-950 p-6 xl:p-8 text-white shadow-[0_24px_70px_rgba(2,12,27,0.22)]">
      <div className="absolute inset-0" aria-live="polite">
        {stories.map((item, storyIndex) => (
          <img
            key={item.image}
            src={item.image}
            alt={storyIndex === index ? item.alt : ""}
            aria-hidden={storyIndex !== index}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-1000 ease-out ${
              storyIndex === index
                ? "scale-100 opacity-100 z-10"
                : "scale-[1.03] opacity-0 z-0"
            }`}
            fetchPriority={storyIndex === 0 ? "high" : "auto"}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(2,12,27,0.94)_0%,rgba(2,12,27,0.72)_36%,rgba(2,12,27,0.12)_78%),linear-gradient(0deg,rgba(2,12,27,0.82)_0%,transparent_48%)]" />

      {/* Header Controls */}
      <header className="relative z-20 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/35 py-1.5 pl-2 pr-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-300 text-slate-950">
            <Sparkles className="h-3 w-3" />
          </span>
          UGem Experience
        </div>
        <div className="flex gap-2 items-center" aria-hidden="true">
          {stories.map((_, storyIndex) => {
            const isActive = storyIndex === index;
            return (
              <button
                key={storyIndex}
                type="button"
                onClick={() => go(storyIndex)}
                className={`relative h-2 overflow-hidden rounded-full transition-all duration-300 ${
                  isActive ? "w-8 bg-white/20" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
                title={`Chuyển đến slide ${storyIndex + 1}`}
              >
                {isActive ? (
                  <div
                    key={`${index}-${paused}`}
                    className="h-full bg-cyan-300 rounded-full"
                    style={{
                      animation: paused
                        ? "none"
                        : `carouselProgress ${intervalMs}ms linear forwards`,
                      width: paused ? "100%" : "0%",
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content Area */}
      <div className="relative z-20 flex flex-1 items-end py-6 xl:py-8">
        <div key={index} className="max-w-xl transition-all duration-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/35 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-cyan-100 backdrop-blur-md">
            <StoryIcon className="h-3.5 w-3.5" />
            {story.eyebrow}
          </span>
          <h2 className="editorial-heading mt-3 max-w-lg text-2xl sm:text-3xl xl:text-3xl 2xl:text-4xl font-black leading-[1.1] text-white">
            {story.title}
          </h2>
          <p className="mt-3 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
            {story.description}
          </p>
        </div>
      </div>

      {/* Footer Controls */}
      {stories.length > 1 ? (
        <footer className="relative z-20 flex items-center justify-between border-t border-white/15 pt-3.5">
          <p className="text-[11px] font-semibold text-slate-300">
            Khám phá · Vận hành · Tăng trưởng
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Nội dung trước"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu"}
              aria-pressed={paused}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Nội dung tiếp theo"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      ) : null}

      <style>{`
        @keyframes carouselProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}

export default HeroCarousel;
