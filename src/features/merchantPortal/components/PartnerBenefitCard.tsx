import {
  ChartNoAxesColumnIncreasing,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

export function PartnerBenefitCard() {
  return (
    <aside className="partner-benefit-card">
      <div className="partner-image">Safe Meals</div>

      <h3>Vì sao nên trở thành đối tác UGem?</h3>

      <ul>
        <li>
          <Megaphone size={17} />
          Tăng độ nhận diện cho quán “trong hẻm”
        </li>

        <li>
          <ShieldCheck size={17} />
          Kết nối với cộng đồng foodie thực tế
        </li>

        <li>
          <ChartNoAxesColumnIncreasing size={17} />
          Hỗ trợ marketing chuyên nghiệp
        </li>
      </ul>

      <div className="partner-contact">
        <span>Cần hỗ trợ?</span>
        <strong>Hotline: 1900 1234</strong>
      </div>
    </aside>
  );
}
