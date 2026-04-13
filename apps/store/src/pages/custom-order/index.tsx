import { useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/shared/layout/main-layout";
import { Form } from "@/shared/ui/form";
import {
  calculateTotalCost,
  useImageUpload,
  type QuoteOrderOptions,
  type OrderOptions,
  type PackagePreset,
  type WizardStepId,
  WIZARD_STEPS,
  PACKAGE_PRESETS,
  useWizardStep,
  useCustomOrderSubmit,
  useCustomOrderSummaryRows,
  ProgressBar,
  CustomOrderCostFooter,
  WizardActionButtons,
  QuantityStep,
  FabricStep,
  SewingStep,
  SpecStep,
  FinishingStep,
  AttachmentStep,
  ConfirmStep,
} from "@/features/custom-order";
import { DesignImagePicker } from "@/features/design";
import { OrderSummaryAside } from "@/shared/composite/order-summary-aside";
import { useAuthStore } from "@/shared/store/auth";
import { toast } from "@/shared/lib/toast";
import { useShippingAddressPopup } from "@/features/shipping";
import { PageLayout } from "@/shared/layout/page-layout";
import { usePricingConfig } from "@/entities/custom-order";
import { PageSeo } from "@/shared/ui/page-seo";

export default function OrderPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const { data: pricingConfig } = usePricingConfig();
  const imageUpload = useImageUpload();

  const [selectedPackage, setSelectedPackage] = useState<PackagePreset | null>(
    null,
  );

  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup();

  const form = useForm<QuoteOrderOptions>({
    defaultValues: {
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",
      tieType: null,
      interlining: null,
      interliningThickness: "THICK",
      sizeType: "ADULT",
      tieWidth: 8,
      triangleStitch: true,
      sideStitch: true,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,
      brandLabel: false,
      careLabel: false,
      quantity: 4,
      referenceImages: null,
      additionalNotes: "",
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

  const wizard = useWizardStep({
    steps: WIZARD_STEPS,
    getValues: form.getValues,
  });
  const summaryRows = useCustomOrderSummaryRows(watchedValues);

  const handleNext = () => {
    if (wizard.currentStep.id === "quantity" && selectedPackage !== null) {
      const values = form.getValues();
      const error = WIZARD_STEPS[0].validate(values);
      if (error) {
        toast.error(error);
        return;
      }
      const attachmentIdx = WIZARD_STEPS.findIndex(
        (s) => s.id === "attachment",
      );
      if (attachmentIdx !== -1) wizard.skipToStep(attachmentIdx);
      return;
    }
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
    totalCost,
  });

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
      <PageSeo
        title="맞춤 넥타이 제작 주문"
        description="기업 단체 넥타이부터 개인 맞춤 타이까지. 원하는 디자인·소재·색상으로 나만의 넥타이를 제작해 드립니다."
        ogUrl="https://essesion.shop/custom-order"
      />
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              contentClassName="space-y-8"
              sidebarClassName="space-y-4"
              sidebar={
                <OrderSummaryAside
                  title="주문 요약"
                  description="현재 선택한 사양을 기준으로 제작 방식과 예상 비용을 확인합니다."
                  rows={summaryRows}
                  footer={
                    <CustomOrderCostFooter
                      options={watchedValues}
                      totalCost={totalCost}
                      sewingCost={sewingCost}
                      fabricCost={fabricCost}
                      pricingConfig={pricingConfig}
                      isLoggedIn={isLoggedIn}
                    />
                  }
                />
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
                  grandTotal={totalCost}
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
                <AttachmentStep
                  imageUpload={imageUpload}
                  pickerSlot={
                    isLoggedIn ? (
                      <DesignImagePicker
                        onAdd={imageUpload.addExistingImages}
                      />
                    ) : undefined
                  }
                />
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
    </>
  );
}
