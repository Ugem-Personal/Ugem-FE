const steps = [
  {
    number: 1,
    title: "Gửi thông tin quán",
    description: "Merchant điền thông tin cơ bản về quán.",
  },
  {
    number: 2,
    title: "Censor thẩm định",
    description: "Censor kiểm tra chất lượng và tính xác thực.",
  },
  {
    number: 3,
    title: "Staff phê duyệt",
    description: "Staff kiểm tra lần cuối và duyệt hồ sơ.",
  },
  {
    number: 4,
    title: "Quán được hiển thị",
    description: "Nếu được duyệt, quán sẽ xuất hiện trên hệ thống.",
  },
];

export function OnboardingSteps() {
  return (
    <section className="merchant-process-card">
      <h2>Quy trình đưa quán lên UGem</h2>
      <p>Đơn giản, minh bạch và đảm bảo chất lượng thẩm định.</p>

      <div className="process-line">
        {steps.map((step) => (
          <article key={step.number} className="process-step">
            <div>{step.number}</div>
            <strong>{step.title}</strong>
            <span>{step.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
