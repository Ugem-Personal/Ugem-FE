const steps = [
  "Thông tin quán",
  "Địa chỉ & vị trí",
  "Thực đơn & hình ảnh",
  "Kiểm tra & gửi",
];

export function OnboardingStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="onboarding-stepper">
      {steps.map((step, index) => {
        const number = index + 1;
        const active = currentStep === number;
        const done = currentStep > number;

        return (
          <div
            key={step}
            className={`stepper-item ${active ? "active" : ""} ${
              done ? "done" : ""
            }`}
          >
            <div>{number}</div>
            <span>{step}</span>
          </div>
        );
      })}
    </div>
  );
}
