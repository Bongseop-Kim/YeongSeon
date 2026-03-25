import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui-extended/button";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/composite/radio-card";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import { cn } from "@/lib/utils";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import { ImageUpload } from "@/features/custom-order/components/image-upload";
import { formatPhoneNumber } from "@/lib/phone-format";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/components/composite/payment-widget";
import { useCreateSampleOrder } from "@/features/sample-order/api/sample-order-query";
import type { CreateSampleOrderFormInput } from "@/features/sample-order/api/sample-order-mapper";
import { IMAGE_FOLDERS } from "@yeongseon/shared";
import { ConsentCheckbox } from "@/components/composite/consent-checkbox";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";
import { NotificationConsentFlowModals } from "@/features/notification/components/notification-consent-flow-modals";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";

interface SampleOrderFormValues {
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  fabricType: "SILK" | "POLY";
  designType: "PRINTING" | "YARN_DYED";
  tieType: "AUTO" | null;
  interlining: "WOOL" | "POLY";
  additionalNotes: string;
}

const SAMPLE_TYPE_CARDS: {
  value: SampleOrderFormValues["sampleType"];
  label: string;
  description: string;
}[] = [
  { value: "fabric", label: "원단 샘플", description: "원단 소재·색상 확인" },
  { value: "sewing", label: "봉제 샘플", description: "봉제 품질·마감 확인" },
  {
    value: "fabric_and_sewing",
    label: "원단+봉제 샘플",
    description: "원단과 봉제 동시 확인",
  },
];

const FABRIC_CARDS: {
  fabricType: "POLY" | "SILK";
  designType: "PRINTING" | "YARN_DYED";
  label: string;
  description: string;
}[] = [
  {
    fabricType: "POLY",
    designType: "PRINTING",
    label: "폴리 · 날염",
    description: "가장 경제적인 선택. 선명한 프린팅 가능",
  },
  {
    fabricType: "POLY",
    designType: "YARN_DYED",
    label: "폴리 · 선염",
    description: "실로 짜는 고급스러운 패턴",
  },
  {
    fabricType: "SILK",
    designType: "PRINTING",
    label: "실크 · 날염",
    description: "실크의 광택과 선명한 프린팅",
  },
  {
    fabricType: "SILK",
    designType: "YARN_DYED",
    label: "실크 · 선염",
    description: "최고급 소재와 전통 직조 기법",
  },
];

const getSamplePrice = (
  pricingConfig: ReturnType<typeof usePricingConfig>["data"] | undefined,
  values: SampleOrderFormValues,
): number | null => {
  if (!pricingConfig) {
    return null;
  }

  if (values.sampleType === "sewing") {
    return pricingConfig.SAMPLE_SEWING_COST;
  }

  if (values.sampleType === "fabric") {
    return values.designType === "PRINTING"
      ? pricingConfig.SAMPLE_FABRIC_PRINTING_COST
      : pricingConfig.SAMPLE_FABRIC_YARN_DYED_COST;
  }

  return values.designType === "PRINTING"
    ? pricingConfig.SAMPLE_FABRIC_AND_SEWING_PRINTING_COST
    : pricingConfig.SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST;
};

const serializeSampleOrderInput = (input: CreateSampleOrderFormInput): string =>
  JSON.stringify({
    ...input,
    additionalNotes: input.additionalNotes.trim(),
  });

export default function SampleOrderPage() {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const pendingOrderIdRef = useRef<string | null>(null);
  const pendingOrderSnapshotRef = useRef<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup();
  const imageUpload = useImageUpload(IMAGE_FOLDERS.SAMPLE_ORDERS);
  const createSampleOrder = useCreateSampleOrder();
  const {
    data: pricingConfig,
    isLoading: isPricingLoading,
    isError: isPricingError,
  } = usePricingConfig();

  const form = useForm<SampleOrderFormValues>({
    defaultValues: {
      sampleType: "fabric",
      fabricType: "POLY",
      designType: "PRINTING",
      tieType: "AUTO",
      interlining: "WOOL",
      additionalNotes: "",
    },
  });

  const values = form.watch();
  const currentFabricValue = `${values.fabricType}-${values.designType}`;
  const isFabricVisible = values.sampleType !== "sewing";

  const samplePrice = getSamplePrice(pricingConfig, values);
  const selectedSampleLabel =
    SAMPLE_TYPE_CARDS.find((o) => o.value === values.sampleType)?.label ?? "-";
  const selectedFabricLabel = isFabricVisible
    ? (FABRIC_CARDS.find(
        (card) =>
          card.fabricType === values.fabricType &&
          card.designType === values.designType,
      )?.label ?? "-")
    : "봉제 전용";
  const paymentStatus = !user
    ? "로그인 필요"
    : !selectedAddress
      ? "배송지 필요"
      : samplePrice === null
        ? isPricingError
          ? "가격 확인 실패"
          : "가격 계산 중"
        : !cancellationConsent
          ? "동의 필요"
          : "결제 가능";
  const paymentStatusDescription = !user
    ? "로그인 후 샘플 주문을 진행할 수 있습니다."
    : !selectedAddress
      ? "배송지를 추가하면 바로 결제를 진행할 수 있습니다."
      : samplePrice === null
        ? isPricingError
          ? "가격 정보를 다시 불러와야 합니다."
          : "샘플 금액을 계산하고 있습니다."
        : !cancellationConsent
          ? "취소 및 환불 제한 동의가 필요합니다."
          : "결제 준비가 완료되었습니다.";
  const isSubmitDisabled =
    !user ||
    !selectedAddress ||
    samplePrice === null ||
    isPaymentLoading ||
    createSampleOrder.isPending ||
    imageUpload.isUploading ||
    !cancellationConsent;

  const proceedToPayment = async () => {
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

    if (samplePrice === null) {
      toast.error(
        isPricingError
          ? "샘플 가격 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          : "샘플 가격 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    if (!paymentWidgetRef.current) {
      toast.error("결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsPaymentLoading(true);

    try {
      const requestInput: CreateSampleOrderFormInput = {
        shippingAddressId: selectedAddressId,
        sampleType: values.sampleType,
        options: {
          fabricType: isFabricVisible ? values.fabricType : null,
          designType: isFabricVisible ? values.designType : null,
          tieType: values.tieType,
          interlining: values.interlining,
        },
        referenceImages: imageUpload.getImageRefs(),
        additionalNotes: values.additionalNotes,
      };
      const pendingSnapshot = serializeSampleOrderInput(requestInput);

      if (
        pendingOrderIdRef.current &&
        pendingOrderSnapshotRef.current !== pendingSnapshot
      ) {
        pendingOrderIdRef.current = null;
        pendingOrderSnapshotRef.current = null;
      }

      const orderId =
        pendingOrderIdRef.current ??
        (await createSampleOrder.mutateAsync(requestInput)).orderId;
      pendingOrderIdRef.current = orderId;
      pendingOrderSnapshotRef.current = pendingSnapshot;

      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: "샘플 주문",
        successUrl: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
        failUrl: `${window.location.origin}${ROUTES.PAYMENT_FAIL}`,
        customerName: user.user_metadata?.name ?? undefined,
      });
      pendingOrderIdRef.current = null;
      pendingOrderSnapshotRef.current = null;
    } catch (error) {
      pendingOrderIdRef.current = null;
      pendingOrderSnapshotRef.current = null;
      if (hasStringCode(error) && error.code === "USER_CANCEL") return;
      toast.error(
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const { initiateWithConsentCheck: handleSubmit, consentFlow } =
    useNotificationConsentFlow(proceedToPayment);

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
                  <UtilityPageAside
                    title="결제 상태"
                    description="선택한 구성과 주문 준비 상태를 한 번에 확인합니다."
                    tone="muted"
                    className="py-5"
                  >
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Status
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="text-lg font-semibold tracking-tight text-zinc-950">
                          {paymentStatus}
                        </p>
                        <p className="text-right text-2xl font-semibold tracking-tight text-zinc-950">
                          {samplePrice === null
                            ? isPricingError
                              ? "-"
                              : "..."
                            : `${samplePrice.toLocaleString()}원`}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        {paymentStatusDescription}
                      </p>
                    </div>

                    <dl className="mt-4">
                      <UtilityKeyValueRow
                        label="샘플 유형"
                        value={selectedSampleLabel}
                      />
                      <UtilityKeyValueRow
                        label="구성"
                        value={selectedFabricLabel}
                      />
                      <UtilityKeyValueRow
                        label="총 결제 금액"
                        value={
                          samplePrice === null
                            ? isPricingError
                              ? "불러오지 못함"
                              : "불러오는 중..."
                            : `${samplePrice.toLocaleString()}원`
                        }
                      />
                    </dl>
                  </UtilityPageAside>
                  {user && (
                    <UtilityPageAside
                      title="결제 수단"
                      description="결제 준비가 완료되면 바로 샘플 주문을 진행할 수 있습니다."
                      tone="muted"
                      className="py-5"
                    >
                      {samplePrice === null ? (
                        <p className="text-sm text-zinc-500">
                          {isPricingLoading
                            ? "결제 금액을 불러오는 중입니다."
                            : "결제 금액을 확인할 수 없어 결제 수단을 표시하지 않습니다."}
                        </p>
                      ) : (
                        <div className="-mx-5">
                          <PaymentWidget
                            ref={paymentWidgetRef}
                            amount={samplePrice}
                            customerKey={user.id}
                          />
                        </div>
                      )}
                      <ConsentCheckbox
                        id="cancellation-consent"
                        checked={cancellationConsent}
                        onCheckedChange={setCancellationConsent}
                        label="취소/환불 불가 동의"
                        description="샘플 주문은 결제 후 중도 취소 및 환불이 불가능합니다."
                        required
                        className="pt-4"
                      />
                    </UtilityPageAside>
                  )}
                </>
              }
              actionBar={
                <div className="space-y-2">
                  <Button
                    type="button"
                    className="w-full rounded-xl disabled:opacity-100"
                    size="xl"
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                  >
                    {samplePrice === null
                      ? isPricingError
                        ? "가격 정보를 확인할 수 없습니다"
                        : "가격 정보 불러오는 중..."
                      : isPaymentLoading
                        ? "결제 요청 중..."
                        : `${samplePrice.toLocaleString()}원 결제하기`}
                  </Button>
                  <p className="text-sm text-center text-zinc-500">
                    {paymentStatusDescription}
                  </p>
                </div>
              }
            >
              <UtilityPageIntro
                eyebrow="Sample Order"
                title="샘플 주문"
                description="확인하고 싶은 원단과 봉제 사양을 정리한 뒤 결제를 진행하세요."
                meta={
                  <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-stone-200 pt-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Sample Type
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-950">
                        {selectedSampleLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Material
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-950">
                        {selectedFabricLabel}
                      </p>
                    </div>
                  </div>
                }
              />

              <UtilityPageSection
                title="샘플 유형"
                description="확인하려는 범위를 먼저 정하면 필요한 옵션만 노출됩니다."
                className="border-b border-stone-200 pb-8"
              >
                <RadioGroup
                  value={values.sampleType}
                  onValueChange={(v) =>
                    form.setValue(
                      "sampleType",
                      v as SampleOrderFormValues["sampleType"],
                    )
                  }
                >
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    {SAMPLE_TYPE_CARDS.map((card) => (
                      <RadioCard
                        key={card.value}
                        value={card.value}
                        id={`sample-type-${card.value}`}
                        selected={values.sampleType === card.value}
                        className={cn(
                          "min-h-32",
                          values.sampleType === card.value && "bg-stone-50/60",
                        )}
                      >
                        <CardHeader className="px-5 pt-4">
                          <CardTitle className="text-lg">
                            {card.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-5">
                          <CardDescription className="leading-6">
                            {card.description}
                          </CardDescription>
                        </CardContent>
                      </RadioCard>
                    ))}
                  </div>
                </RadioGroup>
              </UtilityPageSection>

              {isFabricVisible && (
                <UtilityPageSection
                  title="원단 조합"
                  description="소재와 직조 방식을 선택하면 샘플 구성과 가격이 결정됩니다."
                >
                  <RadioGroup
                    value={currentFabricValue}
                    onValueChange={(val) => {
                      const found = FABRIC_CARDS.find(
                        (c) => `${c.fabricType}-${c.designType}` === val,
                      );
                      if (found) {
                        form.setValue("fabricType", found.fabricType);
                        form.setValue("designType", found.designType);
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {FABRIC_CARDS.map((card) => {
                        const cardValue = `${card.fabricType}-${card.designType}`;
                        return (
                          <RadioCard
                            key={cardValue}
                            value={cardValue}
                            id={`fabric-${cardValue}`}
                            selected={currentFabricValue === cardValue}
                            className={cn(
                              "min-h-28",
                              currentFabricValue === cardValue &&
                                "bg-stone-50/60",
                            )}
                          >
                            <CardHeader className="px-5 pt-4">
                              <CardTitle>{card.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 pb-5">
                              <CardDescription className="leading-6">
                                {card.description}
                              </CardDescription>
                            </CardContent>
                          </RadioCard>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </UtilityPageSection>
              )}

              <UtilityPageSection
                title="봉제 사양"
                description="타이 방식과 심지 구성을 정하면 샘플의 완성도가 달라집니다."
              >
                <div className="space-y-6 border-y border-stone-200 py-4">
                  <section>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        타이 방식
                      </h3>
                    </div>
                    <RadioGroup
                      value={values.tieType ?? "MANUAL"}
                      onValueChange={(v) =>
                        form.setValue("tieType", v === "AUTO" ? "AUTO" : null)
                      }
                    >
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <RadioCard
                          value="AUTO"
                          id="tie-type-auto"
                          selected={values.tieType === "AUTO"}
                        >
                          <CardHeader>
                            <CardTitle>자동 타이 (지퍼)</CardTitle>
                          </CardHeader>
                        </RadioCard>
                        <RadioCard
                          value="MANUAL"
                          id="tie-type-manual"
                          selected={values.tieType === null}
                        >
                          <CardHeader>
                            <CardTitle>수동 타이 (손매듭)</CardTitle>
                          </CardHeader>
                        </RadioCard>
                      </div>
                    </RadioGroup>
                  </section>

                  <section className="border-t border-stone-200 pt-6">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        심지
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        착용감과 형태 유지 기준으로 선택하세요.
                      </p>
                    </div>
                    <RadioGroup
                      value={values.interlining}
                      onValueChange={(v) =>
                        form.setValue(
                          "interlining",
                          v as SampleOrderFormValues["interlining"],
                        )
                      }
                    >
                      <CardTitle className="text-sm text-zinc-600">
                        심지
                      </CardTitle>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <RadioCard
                          value="WOOL"
                          id="interlining-wool"
                          selected={values.interlining === "WOOL"}
                        >
                          <CardHeader>
                            <CardTitle>울 심지</CardTitle>
                          </CardHeader>
                        </RadioCard>
                        <RadioCard
                          value="POLY"
                          id="interlining-poly"
                          selected={values.interlining === "POLY"}
                        >
                          <CardHeader>
                            <CardTitle>폴리 심지</CardTitle>
                          </CardHeader>
                        </RadioCard>
                      </div>
                    </RadioGroup>
                  </section>
                </div>
              </UtilityPageSection>

              <UtilityPageSection
                title="배송 및 참고 자료"
                description="수령 정보와 참고 이미지를 함께 전달하면 제작 오차를 줄일 수 있습니다."
              >
                <section className="border-y border-stone-200 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-950">
                        배송지
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        최종 결제 전 수령 정보를 확인합니다.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openShippingPopup}
                    >
                      배송지 관리
                    </Button>
                  </div>

                  <div className="mt-4">
                    {selectedAddress ? (
                      <div className="space-y-1 text-sm text-zinc-700">
                        <p className="font-medium text-zinc-950">
                          {selectedAddress.recipientName}
                        </p>
                        <p>
                          ({selectedAddress.postalCode}){" "}
                          {selectedAddress.address}{" "}
                          {selectedAddress.detailAddress}
                        </p>
                        <p>
                          {formatPhoneNumber(selectedAddress.recipientPhone)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-lg border-2 border-dashed border-zinc-200 py-4 text-center text-sm text-zinc-500">
                        <p>배송지를 추가해주세요.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openShippingPopup}
                        >
                          배송지 추가
                        </Button>
                      </div>
                    )}
                  </div>
                </section>

                <section className="border-b border-stone-200 py-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-zinc-950">
                      참고 이미지 및 요청사항
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      패턴, 컬러, 봉제 디테일을 이미지와 메모로 전달해 주세요.
                    </p>
                  </div>
                  <ImageUpload
                    uploadedImages={imageUpload.uploadedImages}
                    isUploading={imageUpload.isUploading}
                    onFileSelect={imageUpload.uploadFile}
                    onRemoveImage={imageUpload.removeImage}
                  />
                  <Controller
                    name="additionalNotes"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        id="additionalNotes"
                        placeholder="요청사항을 입력해주세요."
                        maxLength={500}
                        className="min-h-24 rounded-lg border-zinc-300 shadow-none"
                        {...field}
                      />
                    )}
                  />
                </section>
              </UtilityPageSection>
            </PageLayout>
          </Form>
        </MainContent>
      </MainLayout>
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
}
