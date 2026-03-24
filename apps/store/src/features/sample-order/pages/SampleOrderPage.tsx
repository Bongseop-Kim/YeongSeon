import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/composite/radio-card";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
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
              sidebar={
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>결제 금액</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">샘플 유형</span>
                        <span>
                          {
                            SAMPLE_TYPE_CARDS.find(
                              (o) => o.value === values.sampleType,
                            )?.label
                          }
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>총 결제 금액</span>
                        <span>
                          {samplePrice === null
                            ? isPricingError
                              ? "불러오지 못함"
                              : "불러오는 중..."
                            : `${samplePrice.toLocaleString()}원`}
                        </span>
                      </div>
                      {samplePrice === null && (
                        <p className="text-xs text-zinc-500">
                          {isPricingError
                            ? "샘플 가격 정보를 불러오지 못해 결제를 진행할 수 없습니다."
                            : "샘플 가격 정보를 확인한 뒤 결제를 진행할 수 있습니다."}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  {user && (
                    <Card>
                      <CardContent className="px-0">
                        {samplePrice === null ? (
                          <p className="px-6 py-4 text-sm text-zinc-500">
                            {isPricingLoading
                              ? "결제 금액을 불러오는 중입니다."
                              : "결제 금액을 확인할 수 없어 결제 수단을 표시하지 않습니다."}
                          </p>
                        ) : (
                          <PaymentWidget
                            ref={paymentWidgetRef}
                            amount={samplePrice}
                            customerKey={user.id}
                          />
                        )}
                        <ConsentCheckbox
                          id="cancellation-consent"
                          checked={cancellationConsent}
                          onCheckedChange={setCancellationConsent}
                          label="취소/환불 불가 동의"
                          description="샘플 주문은 결제 후 중도 취소 및 환불이 불가능합니다."
                          required
                          className="px-6 pb-6"
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              }
              actionBar={
                <div className="space-y-2">
                  <Button
                    type="button"
                    className="w-full"
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
                  {!selectedAddress && (
                    <p className="text-sm text-center text-zinc-500">
                      배송지를 추가하면 주문을 진행할 수 있어요
                    </p>
                  )}
                </div>
              }
            >
              {/* 샘플 유형 */}
              <Card>
                <CardHeader>
                  <CardTitle>샘플 유형</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={values.sampleType}
                    onValueChange={(v) =>
                      form.setValue(
                        "sampleType",
                        v as SampleOrderFormValues["sampleType"],
                      )
                    }
                  >
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {SAMPLE_TYPE_CARDS.map((card) => (
                        <RadioCard
                          key={card.value}
                          value={card.value}
                          id={`sample-type-${card.value}`}
                          selected={values.sampleType === card.value}
                        >
                          <CardHeader>
                            <CardTitle>{card.label}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription>
                              {card.description}
                            </CardDescription>
                          </CardContent>
                        </RadioCard>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* 원단 조합 — 봉제 샘플만 선택 시 숨김 */}
              {isFabricVisible && (
                <Card>
                  <CardHeader>
                    <CardTitle>원단 조합</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                            >
                              <CardHeader>
                                <CardTitle>{card.label}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <CardDescription>
                                  {card.description}
                                </CardDescription>
                              </CardContent>
                            </RadioCard>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* 봉제 방식 */}
              <Card>
                <CardHeader>
                  <CardTitle>봉제 방식</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* 배송지 */}
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>
                    {selectedAddress?.recipientName ?? "배송지 정보"}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openShippingPopup}
                  >
                    배송지 관리
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedAddress ? (
                    <div className="space-y-1 text-sm text-zinc-700">
                      <p>
                        ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                        {selectedAddress.detailAddress}
                      </p>
                      <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
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
                </CardContent>
              </Card>

              {/* 참고 이미지 + 메모 */}
              <Card>
                <CardContent className="space-y-4 px-4 py-4">
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
                </CardContent>
              </Card>
            </PageLayout>
          </Form>
        </MainContent>
      </MainLayout>
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
}
