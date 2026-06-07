import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/shared/layout/main-layout";
import { Form } from "@/shared/ui/form";
import {
  calculateTotalCost,
  useImageUpload,
  type QuoteOrderOptions,
  WIZARD_STEPS,
  useCustomOrderSubmit,
  useCustomOrderSummaryRows,
  CustomOrderCostFooter,
  QuantityStep,
  FabricStep,
  SewingStep,
  SpecStep,
  FinishingStep,
  AttachmentStep,
} from "@/features/custom-order";
import { DesignImagePicker } from "@/features/design";
import { SummaryCard } from "@/shared/composite/summary-card";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import { useAuthStore } from "@/shared/store/auth";
import { toast } from "@/shared/lib/toast";
import { useShippingAddressPopup } from "@/features/shipping";
import { PageLayout } from "@/shared/layout/page-layout";
import { usePricingConfig } from "@/entities/custom-order";
import { useProfile } from "@/entities/my-page";
import { PageSeo } from "@/shared/ui/page-seo";
import { ROUTES } from "@/shared/constants/ROUTES";
import { createShippingNoticeItems } from "@/shared/lib/shipping-notices";
import {
  getQuoteContactDefaults,
  getQuoteContactValueForMethod,
} from "@/shared/lib/quote-contact-defaults";

export default function OrderPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const { data: profile } = useProfile(isLoggedIn);
  const { data: pricingConfig, isError: isPricingError } = usePricingConfig();
  const imageUpload = useImageUpload();

  const { selectedAddressId, selectedAddress } = useShippingAddressPopup();

  const form = useForm<QuoteOrderOptions>({
    defaultValues: {
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",
      tieType: null,
      interlining: "WOOL",
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
      businessName: "",
      contactMethod: "phone",
      contactValue: "",
    },
  });

  const watchedValues = form.watch();
  const previousContactMethodRef =
    useRef<QuoteOrderOptions["contactMethod"]>("phone");

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!profile) return;

    const defaults = getQuoteContactDefaults({ profile, user });
    const current = form.getValues();
    const contactMethodChanged =
      previousContactMethodRef.current !== current.contactMethod;
    previousContactMethodRef.current = current.contactMethod;
    const nextContactName = current.contactName || defaults.contactName;
    const nextContactMethod = current.contactValue
      ? current.contactMethod
      : defaults.contactMethod;
    const nextContactValue = contactMethodChanged
      ? getQuoteContactValueForMethod({
          method: nextContactMethod,
          profile,
          user,
        })
      : current.contactValue || defaults.contactValue;

    if (
      current.contactName === nextContactName &&
      current.contactMethod === nextContactMethod &&
      current.contactValue === nextContactValue
    ) {
      return;
    }

    form.reset(
      {
        ...current,
        contactName: nextContactName,
        contactMethod: nextContactMethod,
        contactValue: nextContactValue,
      },
      { keepDirtyValues: true },
    );
  }, [form, isLoggedIn, profile, user, watchedValues.contactMethod]);

  const { sewingCost, fabricCost, totalCost } = pricingConfig
    ? calculateTotalCost(watchedValues, pricingConfig)
    : { sewingCost: 0, fabricCost: 0, totalCost: 0 };

  const isQuoteMode = watchedValues.quantity >= 100;
  const shippingNoticeItems = createShippingNoticeItems({
    shippingCost: pricingConfig?.REFORM_SHIPPING_COST,
    periodNotice: "예상 제작 기간은 영업일 기준 28~42일입니다.",
  });

  const summaryRows = useCustomOrderSummaryRows(watchedValues);

  const { handleSubmit, isPending, isSubmitDisabled } = useCustomOrderSubmit({
    selectedAddressId,
    selectedAddress: selectedAddress ?? null,
    imageUpload,
    watchedValues,
    formReset: form.reset,
    totalCost,
  });

  const isFabricHidden = watchedValues.fabricProvided || watchedValues.reorder;

  const scrollToSectionById = (id: string) => {
    if (id === "fabric" && isFabricHidden) return;
    document.getElementById(`custom-order-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSubmitAll = () => {
    const values = form.getValues();
    for (const step of WIZARD_STEPS) {
      if (step.id === "fabric" && isFabricHidden) continue;
      const error = step.validate(values);
      if (error) {
        toast.error(error);
        scrollToSectionById(step.id);
        return;
      }
    }
    void handleSubmit();
  };

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
              breadcrumbs={[
                { label: "홈", to: ROUTES.HOME },
                { label: "주문 제작" },
              ]}
              contentClassName="space-y-8"
              sidebarClassName="space-y-4"
              sidebar={
                <SummaryCard>
                  <SummaryCard.Header
                    title="주문 요약"
                    description="현재 선택한 사양을 기준으로 제작 방식과 예상 비용을 확인합니다."
                  />
                  <SummaryCard.Section>
                    {summaryRows.map((row) => (
                      <SummaryCard.Row
                        key={row.id}
                        label={row.label}
                        value={row.value}
                        className={row.className}
                      />
                    ))}
                    <CustomOrderCostFooter
                      options={watchedValues}
                      totalCost={totalCost}
                      sewingCost={sewingCost}
                      fabricCost={fabricCost}
                      pricingConfig={pricingConfig}
                      isLoggedIn={isLoggedIn}
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
                  amount={totalCost}
                  onClick={handleSubmitAll}
                  isLoading={isPending}
                  isPriceReady={!!pricingConfig}
                  isPriceError={isPricingError && !pricingConfig}
                  disabled={isSubmitDisabled}
                  readyLabel={isQuoteMode ? "견적 요청하기" : undefined}
                  helperText={
                    !isLoggedIn ? (
                      <p className="text-sm text-center text-zinc-500">
                        로그인 후 {isQuoteMode ? "견적 요청" : "주문"}을 진행할
                        수 있어요
                      </p>
                    ) : isQuoteMode && !selectedAddress ? (
                      <p className="text-sm text-center text-zinc-500">
                        배송지를 추가하면 견적 요청을 진행할 수 있어요
                      </p>
                    ) : null
                  }
                />
              }
            >
              <section
                id="custom-order-quantity"
                className="scroll-mt-28 border-t border-stone-200 pt-4"
              >
                <QuantityStep />
              </section>
              {!isFabricHidden && (
                <section id="custom-order-fabric" className="scroll-mt-28">
                  <FabricStep />
                </section>
              )}
              <section id="custom-order-sewing" className="scroll-mt-28">
                <SewingStep />
              </section>
              <section id="custom-order-spec" className="scroll-mt-28">
                <SpecStep />
              </section>
              <section id="custom-order-finishing" className="scroll-mt-28">
                <FinishingStep />
              </section>
              <section id="custom-order-attachment" className="scroll-mt-28">
                <AttachmentStep
                  imageUpload={imageUpload}
                  pickerSlot={
                    <DesignImagePicker onAdd={imageUpload.addExistingImages} />
                  }
                />
              </section>
            </PageLayout>
          </Form>
        </MainContent>
      </MainLayout>
    </>
  );
}
