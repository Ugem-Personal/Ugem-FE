import { BadgeCheck, ShieldCheck } from "lucide-react";

export function TipsSection() {
  return (
    <section className="merchant-tips-grid">
      <article>
        <BadgeCheck size={24} />
        <div>
          <h3>Mẹo chuẩn bị hồ sơ</h3>
          <p>
            Hãy chụp những bức ảnh chân thực nhất về món ăn và không gian. UGem
            đánh giá cao sự mộc mạc và chất lượng cốt lõi.
          </p>
        </div>
      </article>

      <article>
        <ShieldCheck size={24} />
        <div>
          <h3>Tiêu chí thẩm định</h3>
          <p>
            Đội ngũ censor sẽ chấm điểm dựa trên chất lượng món ăn, độ đảm bảo
            trải nghiệm khách quan và tính đặc trưng.
          </p>
        </div>
      </article>
    </section>
  );
}
