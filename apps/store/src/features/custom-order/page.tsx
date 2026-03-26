import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Form } from "@/components/ui/form";
import { calculateTotalCost } from "@/features/custom-order/utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";
import { NotificationConsentFlowModals } from "@/features/notification/components/notification-consent-flow-modals";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import type {
  QuoteOrderOptions,
  OrderOptions,
} from "@/features/custom-order/types/order";
import type {
  PackagePreset,
  WizardStepId,
} from "@/features/custom-order/types/wizard";
import { WIZARD_STEPS } from "@/features/custom-order/constants/WIZARD_STEPS";
import { PACKAGE_PRESETS } from "@/features/custom-order/constants/PACKAGE_PRESETS";
import { useWizardStep } from "@/features/custom-order/hooks/useWizardStep";
import { useCustomOrderSubmit } from "@/features/custom-order/hooks/useCustomOrderSubmit";
import { type PaymentWidgetRef } from "@/components/composite/payment-widget";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { PageLayout } from "@/components/layout/page-layout";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import { ProgressBar } from "@/features/custom-order/components/wizard/progress-bar";
import { StickySummary } from "@/features/custom-order/components/wizard/sticky-summary";
import { WizardActionButtons } from "@/features/custom-order/components/wizard/wizard-action-buttons";
import { QuantityStep } from "@/features/custom-order/components/steps/quantity-step";
import { FabricStep } from "@/features/custom-order/components/steps/fabric-step";
import { SewingStep } from "@/features/custom-order/components/steps/sewing-step";
import { SpecStep } from "@/features/custom-order/components/steps/spec-step";
import { FinishingStep } from "@/features/custom-order/components/steps/finishing-step";
import { AttachmentStep } from "@/features/custom-order/components/steps/attachment-step";
import { ConfirmStep } from "@/features/custom-order/components/steps/confirm-step";
import { PaymentWidgetAside } from "@/components/composite/payment-widget-aside";

export default function OrderPage() {
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const { data: pricingConfig } = usePricingConfig();
  const imageUpload = useImageUpload();

  const [selectedPackage, setSelectedPackage] = useState<PackagePreset | null>(
    null,
  );

  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup();

  const form = useForm<QuoteOrderOptions>({
    defaultValues: {
      // 원단 정보
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",

      // 제작 옵션
      tieType: null,
      interlining: null,
      interliningThickness: "THICK",
      sizeType: "ADULT",
      tieWidth: 8,

      // 추가 옵션
      triangleStitch: true,
      sideStitch: true,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,

      // 라벨 옵션
      brandLabel: false,
      careLabel: false,

      // 주문 정보
      quantity: 4,
      referenceImages: null,
      additionalNotes: "",

      // 견적요청 연락처
      contactName: "",
      contactTitle: "",
      contactMethod: "phone",
      contactValue: "",
    },
  });

  const handleSelectPackage = (preset: PackagePreset) => {
    const config = PACKAGE_PRESETS.find((p) => p.id === preset);
    if (!config) return;
    for (const [key, value] of Object.entries(config.values)) {
      form.setValue(key as keyof OrderOptions, value);
    }
    setSelectedPackage(preset);
  };

  const watchedValues = form.watch();

  const { sewingCost, fabricCost, totalCost } = pricingConfig
    ? calculateTotalCost(watchedValues, pricingConfig)
    : { sewingCost: 0, fabricCost: 0, totalCost: 0 };

  const isQuoteMode = watchedValues.quantity >= 100;
  const shouldRequireCancellationConsent = !isQuoteMode && !!user;

  const grandTotal = totalCost;

  const wizard = useWizardStep({
    steps: WIZARD_STEPS,
    getValues: form.getValues,
  });

  const handleNext = () => {
    const error = wizard.goNext();
    if (error) {
      toast.error(error);
    }
  };

  const { handleSubmit, isPending, isSubmitDisabled } = useCustomOrderSubmit({
    selectedAddressId,
    selectedAddress: selectedAddress ?? null,
    imageUpload,
    watchedValues,
    formReset: form.reset,
    paymentWidgetRef,
  });

  const {
    initiateWithConsentCheck: handleSubmitWithConsentCheck,
    consentFlow,
  } = useNotificationConsentFlow(handleSubmit);

  const isFabricHidden = watchedValues.fabricProvided || watchedValues.reorder;

  const goToStepById = (id: WizardStepId) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (id === "fabric" && isFabricHidden) return;
    wizard.forceGoToStep(idx);
  };

  const isHiddenStep = (index: number) =>
    WIZARD_STEPS[index]?.id === "fabric" && isFabricHidden;

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible bg-zinc-50">
          <Form {...form}>
            <PageLayout
              contentClassName="space-y-8"
              sidebarClassName="space-y-4"
              sidebar={
                <>
                  <StickySummary
                    options={watchedValues}
                    totalCost={totalCost}
                    sewingCost={sewingCost}
                    fabricCost={fabricCost}
                    pricingConfig={pricingConfig}
                    isLoggedIn={isLoggedIn}
                  />
                  {shouldRequireCancellationConsent && (
                    <PaymentWidgetAside
                      title="결제 수단"
                      description="결제 진행 전 주문제작 취소 및 환불 제한에 동의해야 합니다."
                      paymentWidgetRef={paymentWidgetRef}
                      amount={grandTotal}
                      customerKey={user.id}
                      consent={{
                        id: "cancellation-consent",
                        checked: cancellationConsent,
                        onCheckedChange: setCancellationConsent,
                        label: "취소/환불 불가 동의",
                        description:
                          "주문제작(견적요청)은 진행 후 중도 취소 및 환불이 불가능합니다.",
                      }}
                      className="py-5"
                    />
                  )}
                </>
              }
              actionBar={
                <WizardActionButtons
                  isFirstStep={wizard.isFirstStep}
                  isLastStep={wizard.isLastStep}
                  onPrev={wizard.goPrev}
                  onNext={handleNext}
                  onSubmit={handleSubmitWithConsentCheck}
                  isPending={isPending}
                  isSubmitDisabled={
                    isSubmitDisabled ||
                    (wizard.isLastStep &&
                      shouldRequireCancellationConsent &&
                      !cancellationConsent)
                  }
                  isQuoteMode={isQuoteMode}
                  grandTotal={grandTotal}
                  isLoggedIn={isLoggedIn}
                  hasAddress={!!selectedAddress}
                />
              }
            >
              <ProgressBar
                eyebrow="Custom Order"
                pageTitle="주문 제작"
                pageDescription="수량과 제작 사양을 순서대로 정리하면 예상 제작 기간과 비용을 바로 확인할 수 있습니다."
                steps={wizard.steps}
                currentStepIndex={wizard.currentStepIndex}
                visitedSteps={wizard.visitedSteps}
                completedSteps={wizard.completedSteps}
                shouldShowStep={wizard.shouldShowStep}
                isHiddenStep={isHiddenStep}
                onStepClick={wizard.goToStep}
              />
              {wizard.currentStep.id === "quantity" && (
                <QuantityStep
                  isLoggedIn={isLoggedIn}
                  selectedPackage={selectedPackage}
                  onSelectPackage={handleSelectPackage}
                  pricingConfig={pricingConfig}
                />
              )}
              {wizard.currentStep.id === "fabric" && <FabricStep />}
              {wizard.currentStep.id === "sewing" && <SewingStep />}
              {wizard.currentStep.id === "spec" && <SpecStep />}
              {wizard.currentStep.id === "finishing" && <FinishingStep />}
              {wizard.currentStep.id === "attachment" && (
                <AttachmentStep imageUpload={imageUpload} />
              )}
              {wizard.currentStep.id === "confirm" && (
                <ConfirmStep
                  selectedAddress={selectedAddress}
                  onOpenShippingPopup={openShippingPopup}
                  imageUpload={imageUpload}
                  goToStepById={goToStepById}
                />
              )}
            </PageLayout>
          </Form>
        </MainContent>
      </MainLayout>
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
}
