import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Form } from "@/components/ui/form";
import { calculateTotalCost, getEstimatedDays } from "./utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { ROUTES } from "@/constants/ROUTES";
import { useCreateCustomOrder } from "@/features/custom-order/api/custom-order-query";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import { toCreateCustomOrderInput } from "@/features/custom-order/api/custom-order-mapper";
import { useCreateQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { toCreateQuoteRequestInput } from "@/features/quote-request/api/quote-request-mapper";
import type { QuoteOrderOptions, OrderOptions } from "./types/order";
import type { PackagePreset, WizardStepId } from "./types/wizard";
import { WIZARD_STEPS } from "./constants/WIZARD_STEPS";
import { PACKAGE_PRESETS } from "./constants/PACKAGE_PRESETS";
import { SAMPLE_COST } from "./constants/SAMPLE_PRICING";
import { useWizardStep } from "./hooks/useWizardStep";
import { useWizardDraft, useRestoreDraft, useAutoSave } from "./hooks/useWizardDraft";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { PageLayout } from "@/components/layout/page-layout";
import { useBreakpoint } from "@/providers/breakpoint-provider";
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

  const isQuoteMode = watchedValues.quantity >= 100;

  const sampleCost =
    !isQuoteMode && watchedValues.sample && watchedValues.sampleType
      ? SAMPLE_COST[watchedValues.sampleType]
      : 0;
  const grandTotal = totalCost + sampleCost;

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
      ...coreOptions
    } = watchedValues;

    try {
      await createCustomOrder.mutateAsync({
        ...toCreateCustomOrderInput({
          shippingAddressId: selectedAddressId,
          options: coreOptions,
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

  // 비로그인 상태에서는 배송지 조건 없이 submit 허용 → 핸들러 내부에서 로그인 리다이렉트 처리
  const isSubmitDisabled = (isLoggedIn && (!selectedAddressId || !selectedAddress)) || isPending || imageUpload.isUploading;

  const estimatedDays = getEstimatedDays(watchedValues);

  const goToStepById = (id: WizardStepId) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === id);
    if (idx !== -1 && wizard.shouldShowStep(idx)) wizard.forceGoToStep(idx);
  };

  const fabricGuideLabel = watchedValues.fabricProvided
    ? "원단 직접 제공"
    : watchedValues.reorder
      ? "재주문"
      : watchedValues.fabricType && watchedValues.designType
        ? `${watchedValues.fabricType === "SILK" ? "실크" : "폴리"} · ${
            watchedValues.designType === "YARN_DYED" ? "선염" : "날염"
          }`
        : "조합을 선택하세요";

  const sewingGuideLabel = watchedValues.dimple
    ? "딤플"
    : watchedValues.spoderato
      ? "스포데라토"
      : watchedValues.fold7
        ? "7폴드"
        : "일반";

  const sizeGuideLabel = watchedValues.sizeType === "CHILD" ? "아동용" : "성인용";

  const finishingGuideLabel =
    [
      watchedValues.triangleStitch && "삼각",
      watchedValues.sideStitch && "옆선",
      watchedValues.barTack && "바택",
    ]
      .filter(Boolean)
      .join("/") || "기본 마감";

  const sampleGuideLabel = !watchedValues.sample
    ? "샘플 미선택"
    : watchedValues.sampleType === "sewing"
      ? "봉제 샘플"
      : watchedValues.sampleType === "fabric"
        ? "원단 샘플"
        : watchedValues.sampleType === "fabric_and_sewing"
          ? "원단 + 봉제 샘플"
          : "샘플 유형 선택 필요";

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
