import { useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Form } from "@/components/ui/form";
import { calculateTotalCost, getEstimatedDays } from "./utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import type { QuoteOrderOptions, OrderOptions } from "./types/order";
import type { PackagePreset, WizardStepId } from "./types/wizard";
import { WIZARD_STEPS } from "./constants/WIZARD_STEPS";
import { PACKAGE_PRESETS } from "./constants/PACKAGE_PRESETS";
import { useWizardStep } from "./hooks/useWizardStep";
import { useWizardDraft, useRestoreDraft, useAutoSave } from "./hooks/useWizardDraft";
import { useCustomOrderSubmit } from "./hooks/useCustomOrderSubmit";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import {
  getFabricLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getSampleTypeLabel,
} from "./utils/option-labels";
import { PageLayout } from "@/components/layout/page-layout";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import { ProgressBar } from "./components/wizard/progress-bar";
import { StepNavigation } from "./components/wizard/step-navigation";
import { StickySummary } from "./components/wizard/sticky-summary";
import { MobileNavigation } from "./components/wizard/mobile-navigation";
import { QuantityStep } from "./components/steps/quantity-step";
import { FabricStep } from "./components/steps/fabric-step";
import { SewingStep } from "./components/steps/sewing-step";
import { SpecStep } from "./components/steps/spec-step";
import { FinishingStep } from "./components/steps/finishing-step";
import { SampleOptionStep } from "./components/steps/sample-option-step";
import { AttachmentStep } from "./components/steps/attachment-step";
import { ConfirmStep } from "./components/steps/confirm-step";

export default function OrderPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const { data: pricingConfig } = usePricingConfig();
  const imageUpload = useImageUpload();
  const { clearDraft } = useWizardDraft();
  const { isMobile } = useBreakpoint();

  const [selectedPackage, setSelectedPackage] = useState<PackagePreset | null>(null);

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
      tieType: "MANUAL",
      interlining: "POLY",
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
      sample: false,
      sampleType: null,

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

  const { sewingCost, fabricCost, sampleCost, totalCost } = pricingConfig
    ? calculateTotalCost(watchedValues, pricingConfig)
    : { sewingCost: 0, fabricCost: 0, sampleCost: 0, totalCost: 0 };

  const isQuoteMode = watchedValues.quantity >= 100;

  const grandTotal = isQuoteMode ? totalCost - sampleCost : totalCost;

  const wizard = useWizardStep({ steps: WIZARD_STEPS, getValues: form.getValues });

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

  const fabricGuideLabel = getFabricLabel(watchedValues, "조합을 선택하세요");
  const sewingGuideLabel = getSewingStyleLabel(watchedValues);
  const sizeGuideLabel = getSizeLabel(watchedValues.sizeType);

  const finishingGuideLabel =
    [
      watchedValues.triangleStitch && "삼각",
      watchedValues.sideStitch && "옆선",
      watchedValues.barTack && "바택",
    ]
      .filter(Boolean)
      .join("/") || "기본 마감";

  const sampleGuideLabel = getSampleTypeLabel(watchedValues) ?? "샘플 미선택";

  const attachmentGuideLabel = `첨부 상태: 이미지 ${
    imageUpload.uploadedImages.length
  }개 / ${
    watchedValues.additionalNotes?.trim() ? "요청사항 입력됨" : "요청사항 입력 가능"
  }`;

  const stepNavigationHintById: Record<WizardStepId, string> = {
    quantity: "최소 주문 수량: 4개",
    fabric: `추천 조합: ${fabricGuideLabel}`,
    sewing: `현재 스타일: ${sewingGuideLabel}`,
    spec: `선택값: ${sizeGuideLabel} / ${watchedValues.tieWidth}cm`,
    finishing: `현재 마감: ${finishingGuideLabel}`,
    sample: `선택 유형: ${sampleGuideLabel}`,
    attachment: attachmentGuideLabel,
    confirm: "제출 전 마지막 확인 단계",
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible bg-zinc-50">
        <Form {...form}>
          <PageLayout
            sidebar={
              <StickySummary
                options={watchedValues}
                totalCost={totalCost}
                sewingCost={sewingCost}
                fabricCost={fabricCost}
                sampleCost={sampleCost}
                pricingConfig={pricingConfig}
                isLoggedIn={isLoggedIn}
                isQuoteMode={isQuoteMode}
              />
            }
            sidebarClassName={isMobile ? "pb-24" : ""}
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
              {wizard.currentStep.id === "sample" && <SampleOptionStep />}
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
              {!isMobile && (
                <StepNavigation
                  isFirstStep={wizard.isFirstStep}
                  isLastStep={wizard.isLastStep}
                  isQuoteMode={isQuoteMode}
                  isPending={isPending}
                  isSubmitDisabled={isSubmitDisabled}
                  hintText={stepNavigationHintById[wizard.currentStep.id]}
                  onPrev={wizard.goPrev}
                  onNext={handleNext}
                  onSubmit={handleSubmit}
                />
              )}
          </PageLayout>
          {isMobile && (
            <MobileNavigation
              wizard={wizard}
              isQuoteMode={isQuoteMode}
              isPending={isPending}
              isSubmitDisabled={isSubmitDisabled}
              grandTotal={grandTotal}
              estimatedDays={estimatedDays}
              isLoggedIn={isLoggedIn}
              selectedAddress={selectedAddress}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          )}
        </Form>
      </MainContent>
    </MainLayout>
  );
}
