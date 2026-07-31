import { ArrowRight } from "lucide-react";
import { ApplicationStatusCard } from "../components/ApplicationStatusCard";
import { TipsSection } from "../components/TipsSection";
import { useMyApplications } from "../hooks/useMyApplications";
import { MerchantSidebar } from "../../../shared/layouts/Merchants/MerchantSidebar";
import { MerchantHeader } from "../../../shared/layouts/Merchants/MerchantHeader";
import { OnboardingSteps } from "../../../shared/layouts/Merchants/OnboardingSteps";

function handleSendApplication() {
  globalThis.location.href = "/merchant/application/create";
}

export function MerchantPortalPage() {
  const { data: applications = [], isLoading } = useMyApplications();

  const latestApplication = applications[0];

  // Show the submit card only for first-time applications or rejected resubmits.
  const showSubmitCard =
    !latestApplication || latestApplication.status === "Rejected";

  return (
    <main className="merchant-portal-layout bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_46%,#fff7ed_100%)] relative">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content">
          <section className="merchant-hero-grid gap-6">
            {showSubmitCard && (
              <article className="group relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-multiply" />
                <h1 className="text-[22px] font-black tracking-tight text-slate-900 leading-tight">Đăng ký quán ăn của bạn</h1>
                <p className="mt-3 text-[14px] font-medium text-slate-500 leading-relaxed max-w-md">
                  UGem chỉ hiển thị những quán ăn thật sự underrated sau khi
                  được thẩm định.
                </p>

                <button 
                  type="button" 
                  onClick={handleSendApplication}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-6 py-3.5 text-[14px] font-black tracking-wide text-white shadow-lg shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/30 active:scale-[0.98]"
                >
                  Gửi hồ sơ quán
                  <ArrowRight size={18} />
                </button>
              </article>
            )}

            {isLoading ? (
              <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl flex items-center justify-center">
                <p className="text-[14px] font-bold text-slate-500 animate-pulse">Đang tải trạng thái...</p>
              </section>
            ) : (
              <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.12)]">
                <ApplicationStatusCard application={latestApplication} />
              </div>
            )}
          </section>

          {showSubmitCard && (
            <div className="mt-8 relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
              <OnboardingSteps />
            </div>
          )}

          <div className="mt-8 relative overflow-hidden rounded-[32px] border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-2xl">
            <TipsSection />
          </div>

          <section className="mt-8 relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-cyan-600 to-blue-600 p-8 shadow-lg shadow-cyan-900/20">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl mix-blend-overlay" />
            <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl mix-blend-overlay" />
            <p className="relative text-center text-[16px] font-black tracking-wide text-white drop-shadow-md">
              “Nơi những giá trị ẩm thực đích thực được tôn vinh.”
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
