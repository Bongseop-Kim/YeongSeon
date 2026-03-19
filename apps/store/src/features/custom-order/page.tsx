import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Form } from "@/components/ui/form";
import {
  calculateTotalCost,
  getEstimatedDays,
} from "@/features/custom-order/utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
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
import {
  useWizardDraft,
  useRestoreDraft,
  useAutoSave,
} from "@/features/custom-order/hooks/useWizardDraft";
import { useCustomOrderSubmit } from "@/features/custom-order/hooks/useCustomOrderSubmit";
import { Card, CardContent } from "@/components/ui/card";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/features/payment/components/payment-widget";
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

export default function OrderPage() {
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const { data: pricingConfig } = usePricingConfig();
  const imageUpload = useImageUpload();
  const { clearDraft } = useWizardDraft();

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

  const grandTotal = totalCost;

  const wizard = useWizardStep({
    steps: WIZARD_STEPS,
    getValues: form.getValues,
  });

  useRestoreDraft(form, (stepIndex, visited) => {
    let adjustedIndex = 0;
    for (let i = stepIndex; i >= 0; i--) {
      if (wizard.shouldShowStep(i)) {
        adjustedIndex = i;
        break;
      }
    }
    wizard.resetTo(adjustedIndex, visited);
  });
  useAutoSave(form, wizard);

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
    clearDraft,
    formReset: form.reset,
    paymentWidgetRef,
  });

  const estimatedDays = getEstimatedDays(watchedValues);
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
    <MainLayout>
      <MainContent className="overflow-visible bg-zinc-50">
        <Form {...form}>
          <PageLayout
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
                {!isQuoteMode && user && (
                  <Card className="py-0">
                    <CardContent className="px-0">
                      <PaymentWidget
                        ref={paymentWidgetRef}
                        amount={grandTotal}
                        customerKey={user.id}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            }
            actionBar={
              <WizardActionButtons
                isFirstStep={wizard.isFirstStep}
                isLastStep={wizard.isLastStep}
                onPrev={wizard.goPrev}
                onNext={handleNext}
                onSubmit={handleSubmit}
                isPending={isPending}
                isSubmitDisabled={isSubmitDisabled}
                isQuoteMode={isQuoteMode}
                grandTotal={grandTotal}
                estimatedDays={estimatedDays}
                isLoggedIn={isLoggedIn}
                hasAddress={!!selectedAddress}
              />
            }
          >
            <ProgressBar
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
  );
}
