import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { calculateTotalCost, getEstimatedDays } from "./utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { ROUTES } from "@/constants/ROUTES";
import { usePopup } from "@/hooks/usePopup";
import {
  useDefaultShippingAddress,
  useShippingAddresses,
  shippingKeys,
} from "@/features/shipping/api/shipping-query";
import { SHIPPING_MESSAGE_TYPE } from "@yeongseon/shared/constants/shipping-events";
import { useQueryClient } from "@tanstack/react-query";
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
import { useWizardDraft } from "./hooks/useWizardDraft";
import { WizardLayout } from "./components/wizard/WizardLayout";
import { ProgressBar } from "./components/wizard/ProgressBar";
import { StepNavigation } from "./components/wizard/StepNavigation";
import { StickySummary } from "./components/wizard/StickySummary";
import { QuantityStep } from "./components/steps/QuantityStep";
import { FabricStep } from "./components/steps/FabricStep";
import { SewingStep } from "./components/steps/SewingStep";
import { SpecStep } from "./components/steps/SpecStep";
import { FinishingStep } from "./components/steps/FinishingStep";
import { SampleOptionStep } from "./components/steps/SampleOptionStep";
import { AttachmentStep } from "./components/steps/AttachmentStep";
import { ConfirmStep } from "./components/steps/ConfirmStep";

type ShippingMessageTypeValue =
  (typeof SHIPPING_MESSAGE_TYPE)[keyof typeof SHIPPING_MESSAGE_TYPE];

interface ShippingMessageData {
  type: ShippingMessageTypeValue;
  addressId: string;
}

const isShippingMessageData = (
  data: unknown
): data is ShippingMessageData => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  if (typeof candidate.type !== "string") {
    return false;
  }

  const allowedTypes: ShippingMessageTypeValue[] = [
    SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED,
    SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED,
    SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED,
  ];

  if (!allowedTypes.includes(candidate.type as ShippingMessageTypeValue)) {
    return false;
  }

  return typeof candidate.addressId === "string" && candidate.addressId.length > 0;
};

const OrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const { openPopup } = usePopup();
  const queryClient = useQueryClient();
  const createCustomOrder = useCreateCustomOrder();
  const createQuoteRequest = useCreateQuoteRequest();
  const imageUpload = useImageUpload();
  const draft = useWizardDraft();

  const [selectedPackage, setSelectedPackage] = useState<PackagePreset | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const initializedDefaultAddressRef = useRef(false);

  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();

  // 기본 배송지가 있으면 자동 선택
  useEffect(() => {
    if (
      defaultAddress &&
      !initializedDefaultAddressRef.current
    ) {
      setSelectedAddressId(defaultAddress.id);
      initializedDefaultAddressRef.current = true;
    }
  }, [defaultAddress]);

  // 팝업에서 배송지 선택/생성/업데이트 시 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!isShippingMessageData(event.data)) {
        return;
      }

      switch (event.data.type) {
        case SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED:
          setSelectedAddressId(event.data.addressId);
          break;

        case SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED:
        case SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED:
          queryClient.invalidateQueries({ queryKey: shippingKeys.list() });
          queryClient.invalidateQueries({ queryKey: shippingKeys.default() });
          setSelectedAddressId(event.data.addressId);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  const selectedAddress =
    addresses?.find((addr) => addr.id === selectedAddressId) || defaultAddress;

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

  const { sewingCost, fabricCost, totalCost } =
    calculateTotalCost(watchedValues);

  const sampleCost = watchedValues.sample && watchedValues.sampleType
    ? SAMPLE_COST[watchedValues.sampleType]
    : 0;
  const grandTotal = totalCost + sampleCost;

  const isQuoteMode = watchedValues.quantity >= 100;

  const wizard = useWizardStep({ steps: WIZARD_STEPS, getValues: form.getValues });

  // 마운트 시 드래프트 존재 확인 → 복원 토스트
  const draftCheckedRef = useRef(false);
  const { resetTo } = wizard;
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    const existing = draft.loadDraft();
    if (!existing) return;

    let restored = false;
    let toastId: string | number | undefined;

    const removeClickListener = () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };

    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-sonner-toast]")) return;
      removeClickListener();
      if (toastId !== undefined) toast.dismiss(toastId);
    };

    toastId = toast.info("이전에 작성 중이던 주문이 있어요", {
      action: {
        label: "이어서 하기",
        onClick: () => {
          restored = true;
          removeClickListener();
          form.reset(existing.formValues);
          resetTo(
            existing.currentStepIndex,
            new Set(existing.visitedSteps)
          );
        },
      },
      onDismiss: () => {
        removeClickListener();
        if (!restored) draft.clearDraft();
      },
      onAutoClose: () => {
        removeClickListener();
        if (!restored) draft.clearDraft();
      },
      duration: 8000,
    });

    // 토스트 렌더 후 바깥 클릭 리스너 등록
    // cleanup을 반환하지 않음 — StrictMode에서 cleanup이 리스너를 제거하는 문제 방지
    // 리스너는 바깥 클릭 / onDismiss / onAutoClose / 이어서 하기 시 자체 정리됨
    setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside, true);
    }, 100);
  }, [draft, form, resetTo]);

  // 자동 저장: form values 변경 시 1초 debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        draft.saveDraft({
          formValues: values as QuoteOrderOptions,
          currentStepIndex: wizard.currentStepIndex,
          visitedSteps: [...wizard.visitedSteps],
          savedAt: Date.now(),
        });
      }, 1000);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, wizard.currentStepIndex, wizard.visitedSteps, draft]);

  // 자동 저장: 스텝 이동 시 즉시 저장
  useEffect(() => {
    draft.saveDraft({
      formValues: form.getValues() as QuoteOrderOptions,
      currentStepIndex: wizard.currentStepIndex,
      visitedSteps: [...wizard.visitedSteps],
      savedAt: Date.now(),
    });
  }, [wizard.currentStepIndex, draft, form, wizard.visitedSteps]);

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

      draft.clearDraft();
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

      draft.clearDraft();
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

  const handleSubmit = isQuoteMode
    ? handleCreateQuoteRequest
    : handleCreateOrder;

  const isPending = isQuoteMode
    ? createQuoteRequest.isPending
    : createCustomOrder.isPending;

  const isSubmitDisabled =
    !selectedAddress || isPending || imageUpload.isUploading;

  const estimatedDays = getEstimatedDays(watchedValues);

  const goToStepById = (id: WizardStepId) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === id);
    if (idx !== -1) wizard.goToStep(idx);
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <Form {...form}>
          <WizardLayout
            progressBar={
              <ProgressBar
                steps={wizard.steps}
                currentStepIndex={wizard.currentStepIndex}
                visitedSteps={wizard.visitedSteps}
                shouldShowStep={wizard.shouldShowStep}
                onStepClick={wizard.goToStep}
              />
            }
            navigation={
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
            }
            summary={
              <StickySummary
                options={watchedValues}
                totalCost={totalCost}
                sewingCost={sewingCost}
                fabricCost={fabricCost}
                isLoggedIn={isLoggedIn}
              />
            }
            mobileBottomBar={
              <div className="space-y-2">
                {!wizard.isLastStep && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    {isLoggedIn ? (
                      <span className="text-zinc-900 font-medium">
                        {grandTotal.toLocaleString()}원
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs">
                        예상 기간: {estimatedDays}
                      </span>
                    )}
                    {isLoggedIn && (
                      <span className="text-zinc-500">{estimatedDays}</span>
                    )}
                  </div>
                )}
                {wizard.isLastStep ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      size="xl"
                      className="w-full"
                      disabled={isSubmitDisabled}
                    >
                      {isPending
                        ? isQuoteMode
                          ? "견적요청 처리 중..."
                          : "주문 처리 중..."
                        : isQuoteMode
                          ? "견적요청"
                          : `${grandTotal.toLocaleString()}원 주문하기`}
                    </Button>
                    {!selectedAddress && (
                      <p className="text-sm text-center text-zinc-500">
                        배송지를 추가하면 {isQuoteMode ? "견적요청" : "주문"}을 진행할 수 있어요
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {!wizard.isFirstStep && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={wizard.goPrev}
                        className="flex-none"
                      >
                        이전
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleNext}
                      className="flex-1"
                    >
                      다음
                    </Button>
                  </div>
                )}
              </div>
            }
          >
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
                onOpenShippingPopup={() =>
                  openPopup(`${ROUTES.SHIPPING}?mode=select`)
                }
                imageUpload={imageUpload}
                goToStepById={goToStepById}
              />
            )}
          </WizardLayout>
        </Form>
      </MainContent>
    </MainLayout>
  );
};

export default OrderPage;
