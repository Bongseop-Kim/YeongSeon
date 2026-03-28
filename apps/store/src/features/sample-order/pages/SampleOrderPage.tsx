import { Controller, useForm } from "react-hook-form";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioChoiceField } from "@/components/composite/radio-choice-field";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import { ImageUpload } from "@/features/custom-order/components/image-upload";
import { usePricingConfig } from "@/features/custom-order/api/pricing-query";
import { IMAGE_FOLDERS } from "@yeongseon/shared";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { Field, FieldTitle, FieldDescription } from "@/components/ui/field";
import { OrderSummaryAside } from "@/components/composite/order-summary-aside";
import { PaymentActionBar } from "@/components/composite/payment-action-bar";
import type { CustomPaymentState } from "@/features/order/custom-payment/types";

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

const FABRIC_META_LABELS = {
  POLY: "경제형 베이스",
  SILK: "광택 중심",
  PRINTING: "선명한 발색",
  YARN_DYED: "직조 패턴",
} as const;

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

export default function SampleOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const imageUpload = useImageUpload(IMAGE_FOLDERS.SAMPLE_ORDERS);
  const { data: pricingConfig, isError: isPricingError } = usePricingConfig();

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

  const isSubmitDisabled =
    !user || samplePrice === null || imageUpload.isUploading;

  const handleNavigateToPayment = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
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

    const state: CustomPaymentState = {
      orderType: "sample",
      sampleType: values.sampleType,
      options: {
        fabricType: isFabricVisible ? values.fabricType : null,
        designType: isFabricVisible ? values.designType : null,
        tieType: values.tieType,
        interlining: values.interlining,
      },
      imageRefs: imageUpload.getImageRefs(),
      additionalNotes: values.additionalNotes,
      samplePrice,
      sampleLabel: selectedSampleLabel,
      fabricLabel: selectedFabricLabel,
    };
    navigate(ROUTES.CUSTOM_PAYMENT, { state });
  };

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              contentClassName="space-y-8"
              sidebarClassName="space-y-4"
              sidebar={
                <OrderSummaryAside
                  title="주문 요약"
                  description="선택한 샘플 구성과 예상 결제 금액을 확인합니다."
                  rows={[
                    {
                      id: "sample-type",
                      label: "샘플 유형",
                      value: selectedSampleLabel,
                    },
                    {
                      id: "sample-config",
                      label: "구성",
                      value: selectedFabricLabel,
                    },
                    {
                      id: "sample-total",
                      label: "총 결제 금액",
                      value:
                        samplePrice === null
                          ? isPricingError
                            ? "불러오지 못함"
                            : "불러오는 중..."
                          : `${samplePrice.toLocaleString()}원`,
                    },
                  ]}
                />
              }
              actionBar={
                <PaymentActionBar
                  amount={samplePrice}
                  onClick={handleNavigateToPayment}
                  isPriceReady={samplePrice !== null}
                  isPriceError={isPricingError && samplePrice === null}
                  disabled={isSubmitDisabled}
                  helperText={
                    !user ? (
                      <p className="text-sm text-center text-zinc-500">
                        로그인 후 샘플 주문을 진행할 수 있습니다.
                      </p>
                    ) : null
                  }
                />
              }
            >
              <UtilityPageIntro
                eyebrow="Sample Order"
                title="샘플 주문"
                description="확인하고 싶은 원단과 봉제 사양을 정리한 뒤 결제를 진행하세요."
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
                      <RadioChoiceField
                        key={card.value}
                        value={card.value}
                        id={`sample-type-${card.value}`}
                        selected={values.sampleType === card.value}
                        variant="row"
                        title={card.label}
                        description={card.description}
                        meta={
                          <span>
                            {card.value === "fabric"
                              ? "원단 중심 검토"
                              : card.value === "sewing"
                                ? "봉제 중심 검토"
                                : "원단 + 봉제 동시 검토"}
                          </span>
                        }
                      />
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
                          <RadioChoiceField
                            key={cardValue}
                            value={cardValue}
                            id={`fabric-${cardValue}`}
                            selected={currentFabricValue === cardValue}
                            variant="row"
                            title={card.label}
                            description={card.description}
                            meta={
                              <>
                                <span>
                                  {FABRIC_META_LABELS[card.fabricType]}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="text-zinc-300"
                                >
                                  ·
                                </span>
                                <span>
                                  {FABRIC_META_LABELS[card.designType]}
                                </span>
                              </>
                            }
                          />
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
                    <Field className="mb-3">
                      <FieldTitle>타이 방식</FieldTitle>
                    </Field>
                    <RadioGroup
                      value={values.tieType ?? "MANUAL"}
                      onValueChange={(v) =>
                        form.setValue("tieType", v === "AUTO" ? "AUTO" : null)
                      }
                    >
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <RadioChoiceField
                          value="AUTO"
                          id="tie-type-auto"
                          selected={values.tieType === "AUTO"}
                          variant="row"
                          title="자동 타이 (지퍼)"
                          description="행사 운영과 빠른 착용이 필요한 경우에 적합합니다."
                          meta={
                            <>
                              <span>딤플 가능</span>
                              <span
                                aria-hidden="true"
                                className="text-zinc-300"
                              >
                                ·
                              </span>
                              <span>착용 속도 우선</span>
                            </>
                          }
                        />
                        <RadioChoiceField
                          value="MANUAL"
                          id="tie-type-manual"
                          selected={values.tieType === null}
                          variant="row"
                          title="수동 타이 (손매듭)"
                          description="매듭 형태를 직접 조절해 전통적인 실루엣을 만듭니다."
                          meta={
                            <>
                              <span>수동 매듭</span>
                              <span
                                aria-hidden="true"
                                className="text-zinc-300"
                              >
                                ·
                              </span>
                              <span>표현 자유도 우선</span>
                            </>
                          }
                        />
                      </div>
                    </RadioGroup>
                  </section>

                  <section className="border-t border-stone-200 pt-6">
                    <Field className="mb-3">
                      <FieldTitle>심지</FieldTitle>
                      <FieldDescription>
                        착용감과 형태 유지 기준으로 선택하세요.
                      </FieldDescription>
                    </Field>
                    <RadioGroup
                      value={values.interlining}
                      onValueChange={(v) =>
                        form.setValue(
                          "interlining",
                          v as SampleOrderFormValues["interlining"],
                        )
                      }
                    >
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <RadioChoiceField
                          value="WOOL"
                          id="interlining-wool"
                          selected={values.interlining === "WOOL"}
                          variant="row"
                          title="울 심지"
                          description="볼륨감과 복원력이 좋아 형태 유지에 유리합니다."
                          meta={<span>탄탄한 실루엣</span>}
                        />
                        <RadioChoiceField
                          value="POLY"
                          id="interlining-poly"
                          selected={values.interlining === "POLY"}
                          variant="row"
                          title="폴리 심지"
                          description="가볍고 안정적인 기본형으로 일상적인 샘플 확인에 적합합니다."
                          meta={<span>가벼운 기본형</span>}
                        />
                      </div>
                    </RadioGroup>
                  </section>
                </div>
              </UtilityPageSection>

              <UtilityPageSection
                title="참고 자료"
                description="참고 이미지를 함께 전달하면 제작 오차를 줄일 수 있습니다."
              >
                <section className="border-b border-stone-200 py-6">
                  <ImageUpload
                    uploadedImages={imageUpload.uploadedImages}
                    isUploading={imageUpload.isUploading}
                    onFileSelect={imageUpload.uploadFile}
                    onRemoveImage={imageUpload.removeImage}
                  />

                  <Field className="py-6">
                    <FieldTitle>요청사항</FieldTitle>
                    <FieldDescription>메모로 전달해 주세요.</FieldDescription>
                  </Field>
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
    </>
  );
}
