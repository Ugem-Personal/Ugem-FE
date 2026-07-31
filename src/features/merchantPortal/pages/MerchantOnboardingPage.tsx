import { useState, useMemo } from "react";
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
import { BusinessInfoStep } from "../components/BusinessInfoStep";
import { AddressLocationStep } from "../components/AddressLocationStep";
import { MenuDetailsStep } from "../components/MenuDetailsStep";

import { PartnerBenefitCard } from "../components/PartnerBenefitCard";
import { ReviewSubmitStep } from "../components/ReviewSubmitStep";
import {
  onboardingSchema,
  type OnboardingFormValues,
  type OnboardingSchema,
} from "../schema";
import {
  useCreateApplication,
  useResubmitApplication,
} from "../hooks/useCreateApplication";
import { useMyApplications } from "../hooks/useMyApplications";
import { OnboardingSidebar } from "../../../shared/layouts/Merchants/OnboardingSidebar";
import { OnboardingTopbar } from "../../../shared/layouts/Merchants/OnboardingTopbar";
import { OnboardingStepper } from "../../../shared/layouts/Merchants/OnboardingStepper";
import { notify } from "@/shared/lib/notify";
import { getCurrentUser } from "@/features/auth";

const DRAFT_KEY = "ugem_merchant_application_draft";

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

function getSubmittableImageUrl(imageUrl?: string) {
  const trimmed = imageUrl?.trim() ?? "";

  if (!trimmed || trimmed.startsWith("data:image/") || trimmed.length > 500) {
    return "";
  }

  return trimmed;
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
      <OnboardingSidebar />

      <section className="onboarding-main">
        <OnboardingTopbar />

        <div className="onboarding-content">
          <div className="onboarding-form-area">
            <div className="onboarding-heading">
              <h1>Đăng ký đối tác mới</h1>
              <p>
                Bắt đầu hành trình đưa món ngon ẩn mình của bạn đến với mọi
                người.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${iconBoxClass}`}
              >
                <Icon className={`h-10 w-10 ${iconClass}`} />
              </div>

              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                {title}
              </h2>

              <p className="mb-8 max-w-md text-slate-600">{description}</p>

              <button
                type="button"
                onClick={onNavigateToPortal}
                className="next-button"
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
  const [currentStep, setCurrentStep] = useState(1);

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
      restaurantType: "",
      mainDishType: "",
      priceRange: "",
      openingHours: "08:00 - 22:00",
      address: "",
      latitude: 0,
      longitude: 0,
      logoUrl: "",
      menu: [
        {
          name: "",
          description: "",
          price: 0,
          imageUrl: "",
          imageUploadDataUrl: "",
          category: "",
        },
      ],
      ...getDraftValues(),
    },
  });

  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = methods;
  const watchedAddress = useWatch({ control, name: "address" });
  const watchedLat = useWatch({ control, name: "latitude" });
  const watchedLng = useWatch({ control, name: "longitude" });

  // Show blocked UI when the current application should not be submitted again.
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
      1: [
        "restaurantName",
        "email",
        "phone",
        "restaurantType",
        "mainDishType",
        "priceRange",
        "openingHours",
        "logoUrl",
      ],
      2: ["address", "latitude", "longitude"],
      3: ["menu"],
      4: [],
    };

    const valid = await trigger(fieldsByStep[currentStep]);

    if (!valid) return;

    setCurrentStep(Math.min(currentStep + 1, 4));
  }

  function previousStep() {
    setCurrentStep(Math.max(currentStep - 1, 1));
  }

  function buildDescription(values: OnboardingSchema) {
    const descriptionLines = [
      values.description?.trim() || "",
      "",
      "--- Thông tin UI bổ sung ---",
      `Địa chỉ: ${values.address}`,
      `Loại hình quán: ${values.restaurantType}`,
      `Loại món chính: ${values.mainDishType}`,
      `Khoảng giá trung bình: ${values.priceRange}`,
    ];

    return descriptionLines
      .filter((line) => line !== undefined && line !== "")
      .join("\n")
      .trim();
  }

  async function onSubmit(values: OnboardingSchema) {
    // Validate that all prices are valid numbers
    const validMenu = values.menu.map((menuItem) => {
      const price = Number(menuItem.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Giá món phải là số dương");
      }
      return {
        ...menuItem,
        price,
      };
    });

    const toastId = notify.loading(
      isRejected ? "Đang gửi lại hồ sơ..." : "Đang gửi hồ sơ...",
      {
        description: "UGem đang chuyển hồ sơ của bạn đến staff xét duyệt.",
      },
    );

    submitMutation.mutate(
      {
        name: values.restaurantName,
        email: values.email,
        description: buildDescription(values),
        restaurantType: values.restaurantType,
        mainDishType: values.mainDishType,
        priceRange: values.priceRange,
        phone: values.phone,
        logoUrl: values.logoUrl || "",
        openingHours: values.openingHours,
        address: values.address,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        menu: validMenu.map((menuItem) => ({
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          category: menuItem.category,
          imageUrl: getSubmittableImageUrl(menuItem.imageUrl),
        })),
      },
      {
        onSuccess: () => {
          localStorage.removeItem(DRAFT_KEY);
          notify.success(
            isRejected
              ? "Đã gửi lại hồ sơ quán thành công"
              : "Đã gửi hồ sơ quán thành công",
            {
              id: toastId,
              description:
                "Bạn có thể theo dõi trạng thái xét duyệt trong Merchant Portal.",
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
    void handleSubmit(onSubmit)();
  }

  return (
    <FormProvider {...methods}>
      <main className="merchant-onboarding-layout">
        <OnboardingSidebar />

        <section className="onboarding-main">
          <OnboardingTopbar />

          <form
            className="onboarding-content"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="onboarding-form-area">
              <OnboardingStepper currentStep={currentStep} />

              <div className="onboarding-heading">
                <h1>Đăng ký đối tác mới</h1>
                <p>
                  Bắt đầu hành trình đưa món ngon ẩn mình của bạn đến với mọi
                  người.
                </p>
              </div>

              {currentStep === 1 && (
                <BusinessInfoStep
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
                />
              )}

              {currentStep === 2 && (
                <AddressLocationStep
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  watchedAddress={watchedAddress}
                  watchedLat={watchedLat}
                  watchedLng={watchedLng}
                />
              )}

              {currentStep === 3 && (
                <MenuDetailsStep
                  control={control}
                  register={register}
                  errors={errors}
                  setValue={setValue}
                />
              )}

              {currentStep === 4 && <ReviewSubmitStep watch={watch} />}

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

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      className="next-button"
                      onClick={nextStep}
                    >
                      Tiếp tục
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
                        ? "Đang gửi..."
                        : isRejected
                          ? "Gửi lại hồ sơ"
                          : "Gửi hồ sơ"}
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
