import { useEffect, useState, useMemo } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Store,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoreInfoLocationStep } from "../components/StoreInfoLocationStep";
import { StorePhotoStep } from "../components/StorePhotoStep";
import { LegalDocsStep } from "../components/LegalDocsStep";
import { PartnerBenefitCard } from "../components/PartnerBenefitCard";
import {
  onboardingSchema,
  type OnboardingFormValues,
  type OnboardingSchema,
} from "../schema";
import {
  useCreateApplication,
  useResubmitApplication,
} from "../hooks/useCreateApplication";
import { checkStoreAvailability } from "../services";
import { useMyApplications } from "../hooks/useMyApplications";
import { OnboardingSidebar } from "../../../shared/layouts/Merchants/OnboardingSidebar";
import { OnboardingTopbar } from "../../../shared/layouts/Merchants/OnboardingTopbar";
import { OnboardingStepper } from "../../../shared/layouts/Merchants/OnboardingStepper";
import { notify } from "@/shared/lib/notify";
import { getCurrentUser } from "@/features/auth";

const DRAFT_KEY = "ufind_merchant_application_draft";
const DRAFT_STEP_KEY = "ufind_merchant_application_draft_step";

function getDraftStep() {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    if (
      !savedDraft ||
      typeof savedDraft !== "object" ||
      Object.keys(savedDraft).length === 0
    ) {
      return 1;
    }

    const savedStep = Number(localStorage.getItem(DRAFT_STEP_KEY));
    return Number.isInteger(savedStep) && savedStep >= 1 && savedStep <= 3
      ? savedStep
      : 1;
  } catch {
    return 1;
  }
}

function getDraftValues(): Partial<OnboardingFormValues> {
  try {
    const rawDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");

    return {
      ...rawDraft,
      latitude:
        typeof rawDraft?.latitude === "number" &&
        Number.isFinite(rawDraft.latitude)
          ? rawDraft.latitude
          : 0,
      longitude:
        typeof rawDraft?.longitude === "number" &&
        Number.isFinite(rawDraft.longitude)
          ? rawDraft.longitude
          : 0,
    };
  } catch {
    return {};
  }
}

function getLatestApplication(
  applications: ReturnType<typeof useMyApplications>["data"],
) {
  if (!applications || applications.length === 0) return null;
  return [...applications].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  })[0];
}

function isApprovedStatus(status?: string) {
  return status === "Approved" || status === "Accepted" || status === "Accept";
}

// BlockedStateUI - shown when the latest application cannot be submitted again
function BlockedStateUI({
  onNavigateToPortal,
  status,
}: {
  onNavigateToPortal: () => void;
  status: "Approved" | "Pending";
}) {
  const isPending = status === "Pending";
  const Icon = isPending ? Clock3 : CheckCircle2;
  const iconBoxClass = isPending ? "bg-amber-100" : "bg-emerald-100";
  const iconClass = isPending ? "text-amber-600" : "text-emerald-600";
  const title = isPending
    ? "Hồ sơ của bạn đang chờ duyệt"
    : "Quán của bạn đã được duyệt";
  const description = isPending
    ? "Hồ sơ quán của bạn đã được gửi và đang chờ thẩm định. Bạn không cần gửi thêm hồ sơ mới."
    : "Hồ sơ quán của bạn đã được thẩm định và chấp thuận. Bạn không thể gửi hồ sơ mới.";
  const buttonLabel = isPending
    ? "Xem trạng thái hồ sơ"
    : "Quay về Merchant Portal";

  return (
    <main className="merchant-onboarding-layout">
      <OnboardingSidebar currentStep={3} />

      <section className="onboarding-main">
        <OnboardingTopbar />

        <div className="onboarding-content">
          <div className="onboarding-form-area">
            <div className="onboarding-heading">
              <h1>Đăng ký mở quán trên UFind</h1>
              <p>
                Bắt đầu hành trình đưa món ngon đặc trưng của quán đến với mọi người.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${iconBoxClass}`}
              >
                <Icon className={`h-10 w-10 ${iconClass}`} />
              </div>

              <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="mb-8 max-w-md text-slate-600 dark:text-slate-300">
                {description}
              </p>

              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2"
                onClick={onNavigateToPortal}
              >
                <Store size={18} />
                {buttonLabel}
              </button>
            </div>
          </div>

          <PartnerBenefitCard />
        </div>
      </section>
    </main>
  );
}

export function MerchantOnboardingPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const portalPath =
    user?.Role === "Customer" || user?.Role === "Reviewer"
      ? "/customer"
      : "/merchant";
  const createMutation = useCreateApplication();
  const [currentStep, setCurrentStep] = useState(getDraftStep);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STEP_KEY, String(currentStep));
    } catch {
      // Storage unavailable fallback
    }
  }, [currentStep]);

  // Check whether this user should create, resubmit, or only view status.
  const { data: applications = [], isLoading: isLoadingApps } =
    useMyApplications();

  const latestApplication = useMemo(
    () => getLatestApplication(applications),
    [applications],
  );
  const resubmitMutation = useResubmitApplication(latestApplication?.id);

  const isApproved = isApprovedStatus(latestApplication?.status);
  const isPending = latestApplication?.status === "Pending";
  const isRejected = latestApplication?.status === "Rejected";
  const showBlockedUI = !isLoadingApps && (isApproved || isPending);
  const submitMutation = isRejected ? resubmitMutation : createMutation;

  const methods = useForm<OnboardingFormValues, unknown, OnboardingSchema>({
    resolver: zodResolver(onboardingSchema),
    mode: "onSubmit",
    defaultValues: {
      restaurantName: "",
      email: "",
      phone: "",
      description: "",
      address: "",
      latitude: 0,
      longitude: 0,
      logoUrl: "",
      storePhoto2Url: "",
      representativeName: "",
      idCardNumber: "",
      idCardFrontUrl: "",
      idCardBackUrl: "",
      businessLicenseUrl: "",
      businessLicenseNumber: "",
      restaurantType: "Quán ăn / Đồ uống",
      mainDishType: "Món đặc trưng",
      priceRange: "Tự động theo menu",
      openingHours: "Chưa thiết lập (Chủ quán cài đặt sau)",
      menu: [],
      ...getDraftValues(),
    },
  });

  const {
    register,
    control,
    watch,
    setValue,
    setError,
    trigger,
    handleSubmit,
    subscribe,
    formState: { errors },
  } = methods;

  const watchedAddress = useWatch({ control, name: "address" });
  const watchedLat = useWatch({ control, name: "latitude" });
  const watchedLng = useWatch({ control, name: "longitude" });

  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
        } catch {
          // Storage unavailable fallback
        }
      },
    });
  }, [subscribe]);

  if (showBlockedUI) {
    return (
      <BlockedStateUI
        status={isPending ? "Pending" : "Approved"}
        onNavigateToPortal={() =>
          navigate(isPending ? "/merchant/application/status" : portalPath)
        }
      />
    );
  }

  async function nextStep() {
    const fieldsByStep: Record<number, (keyof OnboardingFormValues)[]> = {
      1: ["restaurantName", "email", "phone", "address", "latitude", "longitude"],
      2: ["logoUrl"],
      3: ["representativeName", "idCardFrontUrl", "idCardBackUrl", "businessLicenseUrl"],
    };

    const valid = await trigger(fieldsByStep[currentStep]);
    if (!valid) return;

    if (currentStep === 1) {
      const name = watch("restaurantName")?.trim();
      const phone = watch("phone")?.trim();
      const email = watch("email")?.trim();
      const address = watch("address")?.trim();

      if (name && phone && email) {
        setCheckingAvailability(true);
        try {
          const result = await checkStoreAvailability({
            name,
            phone,
            email,
            address,
            applicationId: latestApplication?.id,
          });

          if (!result.available) {
            let hasConflict = false;
            if (result.conflicts.name) {
              setError("restaurantName", {
                type: "manual",
                message: result.conflicts.name,
              });
              hasConflict = true;
            }
            if (result.conflicts.phone) {
              setError("phone", {
                type: "manual",
                message: result.conflicts.phone,
              });
              hasConflict = true;
            }
            if (result.conflicts.email) {
              setError("email", {
                type: "manual",
                message: result.conflicts.email,
              });
              hasConflict = true;
            }

            if (hasConflict) {
              notify.error("Thông tin quán bị trùng lặp", {
                description:
                  result.conflicts.name ||
                  result.conflicts.phone ||
                  result.conflicts.email,
              });
              return;
            }
          }
        } catch {
          // If check fails due to network, proceed and let backend enforce on submit
        } finally {
          setCheckingAvailability(false);
        }
      }
    }

    setCurrentStep(Math.min(currentStep + 1, 3));
  }

  function previousStep() {
    setCurrentStep(Math.max(currentStep - 1, 1));
  }

  async function onSubmit(values: OnboardingSchema) {
    const toastId = notify.loading(
      isRejected ? "Đang gửi lại hồ sơ..." : "Đang gửi hồ sơ thẩm định...",
      {
        description: "UFind đang chuyển hồ sơ pháp lý của bạn đến Staff kiểm duyệt.",
      },
    );

    // Format legal documents into description for structured review
    const legalDocsSummary = [
      values.description?.trim() || "",
      "",
      "--- THÔNG TIN PHÁP LÝ & ĐỊNH DANH (KYC) ---",
      `Loại hình ẩm thực: ${values.restaurantType || "Quán ăn / Đồ uống"}`,
      `Người đại diện: ${values.representativeName}`,
      values.idCardNumber ? `Số CCCD: ${values.idCardNumber}` : "",
      `CCCD Mặt trước: ${values.idCardFrontUrl}`,
      `CCCD Mặt sau: ${values.idCardBackUrl}`,
      values.businessLicenseNumber ? `Mã số GPKD: ${values.businessLicenseNumber}` : "",
      `Giấy phép KD: ${values.businessLicenseUrl}`,
      values.storePhoto2Url ? `Ảnh không gian quán: ${values.storePhoto2Url}` : "",
    ].filter(Boolean).join("\n");

    submitMutation.mutate(
      {
        name: values.restaurantName,
        email: values.email,
        phone: values.phone,
        description: legalDocsSummary,
        restaurantType: values.restaurantType || "Quán ăn / Đồ uống",
        mainDishType: values.mainDishType || "Món đặc trưng",
        priceRange: values.priceRange || "Tự động theo menu",
        openingHours: values.openingHours || "Chưa thiết lập (Chủ quán cài đặt sau)",
        address: values.address,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        logoUrl: values.logoUrl || "",
        menu: [],
      },
      {
        onSuccess: () => {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.removeItem(DRAFT_STEP_KEY);
          notify.success(
            isRejected
              ? "Đã gửi lại hồ sơ quán thành công"
              : "Đã gửi hồ sơ quán thành công",
            {
              id: toastId,
              description:
                "Staff UFind sẽ tiến hành thẩm định và phản hồi trong thời gian sớm nhất.",
            },
          );
          navigate("/merchant/application/status");
        },
        onError: (error) => {
          notify.error(
            isRejected ? "Gửi lại hồ sơ thất bại" : "Gửi hồ sơ thất bại",
            {
              id: toastId,
              description:
                error instanceof Error
                  ? error.message
                  : "Có lỗi xảy ra, vui lòng thử lại.",
            },
          );
        },
      },
    );
  }

  function handleSubmitClick() {
    trigger().then((valid) => {
      if (valid) {
        handleSubmit(onSubmit)();
      }
    });
  }

  return (
    <FormProvider {...methods}>
      <main className="merchant-onboarding-layout">
        <OnboardingSidebar
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step <= currentStep) setCurrentStep(step);
          }}
        />

        <section className="onboarding-main">
          <OnboardingTopbar />

          <form
            className="onboarding-content"
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep < 3) {
                void nextStep();
              } else {
                handleSubmitClick();
              }
            }}
          >
            <div className="onboarding-form-area">
              <OnboardingStepper currentStep={currentStep} />

              <div className="onboarding-heading">
                <h1>Đăng ký mở quán trên UFind</h1>
                <p>
                  Thủ tục tinh gọn: Chỉ cần thông tin quán, hình ảnh thực tế và hồ sơ pháp lý (CCCD &amp; GPKD).
                </p>
              </div>

              {currentStep === 1 && (
                <StoreInfoLocationStep
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
                  watchedAddress={watchedAddress}
                  watchedLat={watchedLat}
                  watchedLng={watchedLng}
                />
              )}

              {currentStep === 2 && (
                <StorePhotoStep
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
                />
              )}

              {currentStep === 3 && (
                <LegalDocsStep
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
                />
              )}

              {submitMutation.isError && (
                <p className="form-error">
                  {submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : "Gửi hồ sơ thất bại"}
                </p>
              )}

              <div className="onboarding-actions">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      className="back-button"
                      onClick={previousStep}
                    >
                      <ArrowLeft size={18} />
                      Quay lại
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      className="next-button"
                      disabled={checkingAvailability}
                      onClick={nextStep}
                    >
                      {checkingAvailability ? "Đang kiểm tra..." : "Tiếp tục"}
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="next-button"
                      disabled={submitMutation.isPending}
                      onClick={handleSubmitClick}
                    >
                      {submitMutation.isPending
                        ? "Đang gửi hồ sơ..."
                        : isRejected
                          ? "Gửi lại hồ sơ"
                          : "Gửi hồ sơ thẩm định"}
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <PartnerBenefitCard />
          </form>
        </section>
      </main>
    </FormProvider>
  );
}
