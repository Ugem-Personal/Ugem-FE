import { Check } from "lucide-react";

const steps = [
  "Thông tin & Vị trí quán",
  "Hình ảnh thực tế",
  "Hồ sơ pháp lý (CCCD & GPKD)",
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
            <div>{done ? <Check className="h-4 w-4" /> : number}</div>
            <span>{step}</span>
          </div>
        );
      })}
    </div>
  );
}
