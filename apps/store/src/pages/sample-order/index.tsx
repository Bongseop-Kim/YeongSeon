import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Form } from "@/shared/ui/form";
import { Textarea } from "@/shared/ui/textarea";
import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useAuthStore } from "@/shared/store/auth";
import { toast } from "@/shared/lib/toast";
import { useImageUpload, ImageUpload } from "@/features/custom-order";
import { DesignImagePicker } from "@/features/design";
import { usePricingConfig } from "@/entities/custom-order";
import { IMAGE_FOLDERS } from "@yeongseon/shared";
import { SummaryCard } from "@/shared/composite/summary-card";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import type { SampleOrderPaymentState } from "@/shared/lib/custom-payment-state";
import { PageSeo } from "@/shared/ui/page-seo";
import { analytics } from "@/shared/lib/analytics";
import { createShippingNoticeItems } from "@/shared/lib/shipping-notices";
import { Field, FieldContent, FieldTitle } from "@/shared/ui/field";

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
}[] = [
  { value: "fabric", label: "원단 샘플" },
  { value: "sewing", label: "봉제 샘플" },
  {
    value: "fabric_and_sewing",
    label: "원단 + 봉제 샘플",
  },
];

const FABRIC_CARDS: {
  fabricType: "POLY" | "SILK";
  designType: "PRINTING" | "YARN_DYED";
  label: string;
}[] = [
  {
    fabricType: "POLY",
    designType: "PRINTING",
    label: "폴리 · 납염",
  },
  {
    fabricType: "POLY",
    designType: "YARN_DYED",
    label: "폴리 · 선염",
  },
  {
    fabricType: "SILK",
    designType: "PRINTING",
    label: "실크 · 납염",
  },
  {
    fabricType: "SILK",
    designType: "YARN_DYED",
    label: "실크 · 선염",
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

function SampleOrderSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldTitle as="h2">{title}</FieldTitle>
      <FieldContent>{children}</FieldContent>
    </Field>
  );
}

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
  const shippingNoticeItems = createShippingNoticeItems({
    shippingCost: pricingConfig?.REFORM_SHIPPING_COST,
    periodNotice: "예상 제작 기간은 영업일 기준 28~42일입니다.",
  });

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

    const state: SampleOrderPaymentState = {
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
    analytics.track("form_submit", { form_type: "sample_order" });
    navigate(ROUTES.SAMPLE_PAYMENT, { state });
  };

  return (
    <>
      <PageSeo
        title="샘플 넥타이 주문"
        description="대량 주문 전 샘플로 먼저 확인하세요. ESSE SION 샘플 서비스로 소재와 품질을 직접 체험할 수 있습니다."
        ogUrl="https://essesion.shop/sample-order"
      />
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              breadcrumbs={[
                { label: "홈", to: ROUTES.HOME },
                { label: "샘플 제작" },
              ]}
              contentClassName="space-y-6"
              sidebarClassName="space-y-4"
              sidebar={
                <SummaryCard>
                  <SummaryCard.Header
                    title="주문 요약"
                    description="선택한 샘플 구성과 예상 결제 금액을 확인합니다."
                  />
                  <SummaryCard.Section>
                    <SummaryCard.Row
                      label="샘플 유형"
                      value={selectedSampleLabel}
                    />
                    <SummaryCard.Row label="구성" value={selectedFabricLabel} />
                    <SummaryCard.Row label="예상 제작 기간" value="28~42일" />
                    <SummaryCard.Total
                      label="총 결제 금액"
                      value={
                        samplePrice === null
                          ? isPricingError
                            ? "불러오지 못함"
                            : "불러오는 중..."
                          : `${samplePrice.toLocaleString()}원`
                      }
                    />
                  </SummaryCard.Section>
                  <SummaryCard.Section>
                    <SummaryCard.NoticeList
                      label="유의사항"
                      items={shippingNoticeItems}
                    />
                  </SummaryCard.Section>
                </SummaryCard>
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
              <SampleOrderSection
                title="샘플 유형"
                className="border-t border-stone-200 pt-4"
              >
                <ChipSinglePicker
                  ariaLabel="샘플 유형"
                  value={values.sampleType}
                  onValueChange={(v) =>
                    form.setValue(
                      "sampleType",
                      v as SampleOrderFormValues["sampleType"],
                    )
                  }
                  options={SAMPLE_TYPE_CARDS.map((card) => ({
                    value: card.value,
                    label: card.label,
                  }))}
                />
              </SampleOrderSection>

              {isFabricVisible && (
                <SampleOrderSection title="원단 조합">
                  <ChipSinglePicker
                    ariaLabel="원단 조합"
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
                    options={FABRIC_CARDS.map((card) => ({
                      value: `${card.fabricType}-${card.designType}`,
                      label: card.label,
                    }))}
                  />
                </SampleOrderSection>
              )}

              <SampleOrderSection title="타이 방식">
                <ChipSinglePicker
                  ariaLabel="타이 방식"
                  value={values.tieType ?? "MANUAL"}
                  onValueChange={(v) =>
                    form.setValue("tieType", v === "AUTO" ? "AUTO" : null)
                  }
                  options={[
                    { value: "AUTO", label: "자동 타이 (재고)" },
                    { value: "MANUAL", label: "수동 타이 (손매듭)" },
                  ]}
                />
              </SampleOrderSection>

              <SampleOrderSection title="심지">
                <ChipSinglePicker
                  ariaLabel="심지"
                  value={values.interlining}
                  onValueChange={(v) =>
                    form.setValue(
                      "interlining",
                      v as SampleOrderFormValues["interlining"],
                    )
                  }
                  options={[
                    { value: "WOOL", label: "울 심지" },
                    { value: "POLY", label: "폴리 심지" },
                  ]}
                />
              </SampleOrderSection>

              <SampleOrderSection title="참고 이미지">
                <div className="space-y-2.5">
                  <ImageUpload
                    uploadedImages={imageUpload.uploadedImages}
                    isUploading={imageUpload.isUploading}
                    onFileSelect={imageUpload.uploadFile}
                    onRemoveImage={imageUpload.removeImage}
                    showHeader={false}
                  />
                  <DesignImagePicker onAdd={imageUpload.addExistingImages} />
                </div>
              </SampleOrderSection>

              <SampleOrderSection title="요청사항">
                <Controller
                  name="additionalNotes"
                  control={form.control}
                  render={({ field }) => (
                    <Textarea
                      id="additionalNotes"
                      placeholder="제작 시 참고할 메모를 자유롭게 적어주세요"
                      maxLength={500}
                      minHeight="large"
                      {...field}
                    />
                  )}
                />
              </SampleOrderSection>
            </PageLayout>
          </Form>
        </MainContent>
      </MainLayout>
    </>
  );
}
