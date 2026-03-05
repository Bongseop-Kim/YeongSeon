import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { calculateTotalCost, getEstimatedDays } from "../utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { ROUTES } from "@/constants/ROUTES";
import { useCreateCustomOrder } from "@/features/custom-order/api/custom-order-query";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import { toCreateCustomOrderInput } from "@/features/custom-order/api/custom-order-mapper";
import { useCreateQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { toCreateQuoteRequestInput } from "@/features/quote-request/api/quote-request-mapper";
import type { QuoteOrderOptions, OrderOptions } from "../types/order";
import type { PackagePreset, WizardStepId } from "../types/wizard";
import { WIZARD_STEPS } from "../constants/WIZARD_STEPS";
import { PACKAGE_PRESETS } from "../constants/PACKAGE_PRESETS";
import { SAMPLE_COST } from "../constants/SAMPLE_PRICING";
import { useWizardStep } from "../hooks/useWizardStep";
import { useWizardDraft, useRestoreDraft, useAutoSave } from "../hooks/useWizardDraft";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { PageLayout } from "@/components/layout/page-layout";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { ProgressBar } from "./wizard/progress-bar";
import { StepNavigation } from "./wizard/step-navigation";
import { StickySummary } from "./wizard/sticky-summary";
import { MobileNavigation } from "./wizard/mobile-navigation";
import { QuantityStep } from "./steps/quantity-step";
import { FabricStep } from "./steps/fabric-step";
import { SewingStep } from "./steps/sewing-step";
import { SpecStep } from "./steps/spec-step";
import { FinishingStep } from "./steps/finishing-step";
import { SampleOptionStep } from "./steps/sample-option-step";
import { AttachmentStep } from "./steps/attachment-step";
import { ConfirmStep } from "./steps/confirm-step";

export const CustomOrderContent = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const createCustomOrder = useCreateCustomOrder();
  const createQuoteRequest = useCreateQuoteRequest();
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

  const { sewingCost, fabricCost, totalCost } = calculateTotalCost(watchedValues);

  const sampleCost =
    watchedValues.sample && watchedValues.sampleType
      ? SAMPLE_COST[watchedValues.sampleType]
      : 0;
  const grandTotal = totalCost + sampleCost;

  const isQuoteMode = watchedValues.quantity >= 100;

  const wizard = useWizardStep({ steps: WIZARD_STEPS, getValues: form.getValues });

  useRestoreDraft(form, wizard.resetTo);
  useAutoSave(form, wizard);

  const handleNext = () => {
    const error = wizard.goNext();
    if (error) {
      toast.error(error);
    }
  };

  const handleCreateQuoteRequest = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }

    if (!watchedValues.contactName.trim()) {
      toast.error("담당자 성함을 입력해주세요.");
      return;
    }

    if (!watchedValues.contactValue.trim()) {
      toast.error("연락처를 입력해주세요.");
      return;
    }

    if (imageUpload.isUploading) {
      toast.error("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const {
      referenceImages,
      additionalNotes,
      sample,
      sampleType,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...optionsWithoutExtra
    } = watchedValues;

    try {
      await createQuoteRequest.mutateAsync({
        ...toCreateQuoteRequestInput({
          shippingAddressId: selectedAddressId,
          options: optionsWithoutExtra,
          referenceImageUrls: imageUpload.getImageUrls(),
          additionalNotes,
          contactName,
          contactTitle,
          contactMethod,
          contactValue,
        }),
      });

      clearDraft();
      toast.success("견적요청이 완료되었습니다!");
      form.reset();
      navigate(ROUTES.ORDER_LIST);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "견적요청 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }

    if (imageUpload.isUploading) {
      toast.error("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const {
      referenceImages,
      additionalNotes,
      sample,
      sampleType,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...optionsWithoutReferenceImages
    } = watchedValues;

    try {
      await createCustomOrder.mutateAsync({
        ...toCreateCustomOrderInput({
          shippingAddressId: selectedAddressId,
          options: optionsWithoutReferenceImages,
          referenceImageUrls: imageUpload.getImageUrls(),
          additionalNotes,
          sample,
          sampleType,
        }),
      });

      clearDraft();
      toast.success("주문이 완료되었습니다!");
      form.reset();
      navigate(ROUTES.ORDER_LIST);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "주문 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  const handleSubmit = isQuoteMode ? handleCreateQuoteRequest : handleCreateOrder;

  const isPending = isQuoteMode
    ? createQuoteRequest.isPending
    : createCustomOrder.isPending;

  const isSubmitDisabled = (isLoggedIn && (!selectedAddressId || !selectedAddress)) || isPending || imageUpload.isUploading;

  const estimatedDays = getEstimatedDays(watchedValues);

  const goToStepById = (id: WizardStepId) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === id);
    if (idx !== -1) wizard.goToStep(idx);
  };

  return (
    <Form {...form}>
      <PageLayout
        sidebar={
          <StickySummary
            options={watchedValues}
            totalCost={totalCost}
            sewingCost={sewingCost}
            fabricCost={fabricCost}
            isLoggedIn={isLoggedIn}
          />
        }
        sidebarClassName={isMobile ? "pb-24" : ""}
      >
        <>
          <ProgressBar
            steps={wizard.steps}
            currentStepIndex={wizard.currentStepIndex}
            visitedSteps={wizard.visitedSteps}
            shouldShowStep={wizard.shouldShowStep}
            onStepClick={wizard.goToStep}
          />
          {wizard.currentStep.id === "quantity" && (
            <QuantityStep
              isLoggedIn={isLoggedIn}
              selectedPackage={selectedPackage}
              onSelectPackage={handleSelectPackage}
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
              onPrev={wizard.goPrev}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          )}
        </>
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
  );
};
