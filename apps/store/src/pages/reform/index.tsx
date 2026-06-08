import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  CameraIcon,
  ReceiptTextIcon,
  RulerIcon,
  ScissorsIcon,
} from "lucide-react";
import { ROUTES } from "@/shared/constants/ROUTES";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { Form } from "@/shared/ui/form";
import { Dialog } from "@/shared/ui-extended/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";
import {
  MobileReformSheet,
  TieItemCard,
  toReformCartItems,
  toReformData,
  useUploadTieImages,
} from "@/features/reform";
import {
  useReformPricing,
  calcTieCost,
  type ReformPricing,
} from "@/entities/reform";
import BulkApplySection, {
  type BulkApplySectionRef,
} from "@/shared/composite/bulk-apply-section";
import type { ReformOptions } from "@yeongseon/shared/types/view/reform";
import { PageLayout } from "@/shared/layout/page-layout";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldLabel, FieldTitle } from "@/shared/ui/field";
import { useModalStore } from "@/shared/store/modal";
import { useCart } from "@/features/cart";
import { useOrderStore } from "@/shared/store/order";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Empty } from "@/shared/composite/empty";
import { UtilityPageSection } from "@/shared/composite/utility-page";
import { SummaryCard } from "@/shared/composite/summary-card";
import { ShopActionBar } from "@/shared/composite/shop-action-bar";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { PageSeo } from "@/shared/ui/page-seo";
import { analytics } from "@/shared/lib/analytics";
import { DataTable } from "@/shared/ui/data-table";
import { HEIGHT_GUIDE } from "@/shared/constants/HEIGHT_GUIDE";
import { createShippingNoticeItems } from "@/shared/lib/shipping-notices";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";

const DEFAULT_TIE_ITEM = {
  id: "tie-1",
  image: undefined,
  measurementType: "height" as const,
  tieLength: undefined,
  wearerHeight: undefined,
  checked: true,
  hasLengthReform: true,
  hasWidthReform: false,
  targetWidth: undefined,
  dimple: false,
};

const DEFAULT_REFORM_OPTIONS: ReformOptions = {
  ties: [DEFAULT_TIE_ITEM],
  bulkApply: {
    measurementType: "height",
    tieLength: undefined,
    wearerHeight: undefined,
    targetWidth: undefined,
    dimple: false,
  },
};

const REFORM_STEPS = [
  {
    title: "사진 업로드",
    description:
      "넥타이 사진만 올려 주세요. 여러 개를 접수할 때도 어떤 넥타이인지 바로 구분할 수 있어요.",
    icon: CameraIcon,
  },
  {
    title: "길이·옵션 입력",
    description:
      "수동 넥타이를 자동 넥타이로 바꿀지, 원하는 폭으로 줄일지 선택해 주세요.",
    icon: RulerIcon,
  },
  {
    title: "일괄 적용 후 접수",
    description:
      "같은 요청을 여러 개에 적용해야 한다면 우측 상단 일괄 적용으로 한 번에 접수할 수 있어요.",
    icon: ReceiptTextIcon,
  },
] as const;

const IMAGE_SECTIONS = [
  {
    eyebrow: "Automatic Reform",
    title: "자동 넥타이로 바꿔보세요",
    description: "지퍼 구조로 더 빠르고 간편하게 착용",
    video: "/images/reform/reform-ver.mov",
    aspect: "aspect-[3/4]",
  },
] as const;

const DIMPLE_CONTENT = [
  {
    label: "Basic",
    title: "기본",
    description: "매끈하고 단정한 매듭 느낌",
    image: "/images/reform/normal.jpeg",
  },
  {
    label: "Dimple",
    title: "딤플",
    description: "중앙 홈이 살아 있는 입체감",
    image: "/images/reform/dimple.jpeg",
  },
] as const;

const BEFORE_AFTER_CONTENT = [
  {
    label: "Before",
    title: "수선 전",
    description: "익숙하지만 어딘가 무거워 보이는 폭",
    image: "/images/reform/wide_cropped.png",
  },
  {
    label: "After",
    title: "폭수선 후",
    description: "같은 넥타이, 딱 맞는 폭으로 다듬어진 인상",
    image: "/images/reform/slim_cropped.png",
  },
] as const;

const ReformPage = () => {
  const { confirm, alert } = useModalStore();
  const { addMultipleReformToCart } = useCart();
  const { setOrderItems } = useOrderStore();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const selectAllCheckboxId = "reform-select-all";
  const [checkedIndicesForBulk, setCheckedIndicesForBulk] = useState<number[]>(
    [],
  );
  const bulkApplySectionRef = useRef<BulkApplySectionRef | null>(null);
  const isSubmittingRef = useRef(false);
  const uploadTieImagesMutation = useUploadTieImages();
  const { data: pricing } = useReformPricing();

  const form = useForm<ReformOptions>({
    defaultValues: DEFAULT_REFORM_OPTIONS,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ties",
  });

  const watchedTies = useWatch({ control: form.control, name: "ties" });

  const addTie = () => {
    append({
      id: `tie-${Date.now()}`,
      image: undefined,
      measurementType: "height",
      tieLength: undefined,
      wearerHeight: undefined,
      checked: true,
      hasLengthReform: true,
      hasWidthReform: false,
      targetWidth: undefined,
      dimple: false,
    });
  };

  const removeTie = (index: number) => {
    remove(index);
  };

  const uploadTiesIfNeeded = useCallback(
    async (ties: ReformOptions["ties"]) => {
      const hasFileImages = ties.some((tie) => tie.image instanceof File);
      if (hasFileImages) return await uploadTieImagesMutation.mutateAsync(ties);
      return ties;
    },
    [uploadTieImagesMutation],
  );

  const selectedTies = useMemo(
    () =>
      watchedTies
        .map((tie, index) => ({ tie, index }))
        .filter(({ tie }) => !!tie.checked),
    [watchedTies],
  );

  const selectedTieIndices = useMemo(
    () => selectedTies.map(({ index }) => index),
    [selectedTies],
  );

  const getSelectedTiesSnapshot = useCallback(() => {
    const ties = form.getValues("ties");
    const selectedIndices: number[] = [];
    const selectedTies: ReformOptions["ties"] = [];
    ties.forEach((tie, index) => {
      if (tie.checked) {
        selectedIndices.push(index);
        selectedTies.push(structuredClone(tie));
      }
    });
    return { selectedIndices, selectedTies };
  }, [form]);

  const hasValidPricing =
    Number.isFinite(pricing?.baseCost) &&
    Number.isFinite(pricing?.shippingCost) &&
    Number.isFinite(pricing?.widthReformCost);

  const withSubmitGuard = useCallback(
    async (
      action: (
        pricing: ReformPricing,
        selectedTies: ReformOptions["ties"],
      ) => Promise<void>,
    ) => {
      if (isSubmittingRef.current) return;
      if (fields.length === 0) {
        confirm("수선할 넥타이를 추가해주세요.");
        return;
      }

      const { selectedIndices, selectedTies } = getSelectedTiesSnapshot();

      if (selectedIndices.length === 0) {
        alert("접수할 넥타이를 선택해주세요.");
        return;
      }

      isSubmittingRef.current = true;
      try {
        const isValid = await form.trigger(
          selectedIndices.map((index) => `ties.${index}` as const),
        );
        if (!isValid) {
          return;
        }
        if (!hasValidPricing || !pricing) {
          confirm(
            "수선 비용 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
          );
          return;
        }
        await action(
          {
            baseCost: pricing.baseCost,
            widthReformCost: pricing.widthReformCost,
          },
          selectedTies,
        );
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [
      alert,
      confirm,
      fields.length,
      form,
      getSelectedTiesSnapshot,
      hasValidPricing,
      pricing,
    ],
  );

  const handleDirectOrder = () =>
    withSubmitGuard(async (pricing, selectedTies) => {
      if (isMobile) {
        setIsPurchaseSheetOpen(true);
        return;
      }

      const uploadedTies = await uploadTiesIfNeeded(selectedTies);
      const orderItems = toReformCartItems(uploadedTies, pricing);
      setOrderItems(orderItems);
      analytics.track("form_submit", { form_type: "reform" });
      navigate(ROUTES.ORDER_FORM);
    });

  const handleMobileOrder = () =>
    withSubmitGuard(async (pricing, selectedTies) => {
      const uploadedTies = await uploadTiesIfNeeded(selectedTies);
      const orderItems = toReformCartItems(uploadedTies, pricing);
      setOrderItems(orderItems);
      analytics.track("form_submit", { form_type: "reform" });
      navigate(ROUTES.ORDER_FORM);
    });

  const handleAddToCart = () =>
    withSubmitGuard(async (pricing, selectedTies) => {
      const uploadedTies = await uploadTiesIfNeeded(selectedTies);

      await addMultipleReformToCart(
        uploadedTies.map((tie) => toReformData(tie, pricing)),
      );

      form.reset(DEFAULT_REFORM_OPTIONS);
      setIsPurchaseSheetOpen(false);
    });

  const formatCost = (cost: number | undefined, suffix = "원") =>
    cost !== undefined ? `${cost.toLocaleString()}${suffix}` : "-";

  const selectedCount = selectedTies.length;
  const totalServiceCost = useMemo(() => {
    if (!hasValidPricing || !pricing || selectedTies.length === 0)
      return undefined;
    return selectedTies.reduce(
      (sum, { tie }) => sum + calcTieCost(tie, pricing),
      0,
    );
  }, [hasValidPricing, pricing, selectedTies]);
  const estimatedShipping =
    hasValidPricing && selectedCount > 0 && pricing
      ? pricing.shippingCost
      : undefined;
  const shippingNoticeItems = createShippingNoticeItems({
    shippingCost: pricing?.shippingCost,
    periodNotice: "예상 수선 기간은 영업일 기준 7~14일입니다.",
  });
  const totalCost =
    totalServiceCost !== undefined && estimatedShipping !== undefined
      ? totalServiceCost + estimatedShipping
      : undefined;

  const handleDelete = () => {
    selectedTieIndices
      .slice()
      .sort((a, b) => b - a)
      .forEach((index) => {
        remove(index);
      });
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const nextChecked = checked === true;

    fields.forEach((_, index) => {
      form.setValue(`ties.${index}.checked`, nextChecked);
    });
  };

  const isAllChecked =
    watchedTies.length > 0 && watchedTies.every((tie) => tie.checked);
  const isSomeChecked = watchedTies.some((tie) => tie.checked);
  const isIndeterminate = isSomeChecked && !isAllChecked;
  const isActionDisabled =
    fields.length === 0 ||
    selectedCount === 0 ||
    uploadTieImagesMutation.isPending;

  return (
    <>
      <PageSeo
        title="넥타이 수선·리폼"
        description="영선산업에서 수동 넥타이를 자동 넥타이로 바꾸거나 원하는 폭으로 수선해 보세요. 여러 개도 쉽게 접수할 수 있습니다."
        ogUrl="https://essesion.shop/reform"
      />
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              breadcrumbs={[
                { label: "홈", to: ROUTES.HOME },
                { label: "넥타이 수선·리폼" },
              ]}
              sidebar={
                <SummaryCard className="mt-6 bg-white lg:mt-0">
                  <SummaryCard.Header title="결제 예상 금액" />
                  <SummaryCard.Section>
                    <SummaryCard.Row
                      label="상품 금액"
                      value={formatCost(totalServiceCost)}
                    />
                    <SummaryCard.Row
                      label="배송비"
                      value={formatCost(estimatedShipping)}
                    />
                    <SummaryCard.Total
                      label="총 결제 금액"
                      value={formatCost(totalCost)}
                    />
                  </SummaryCard.Section>
                  <SummaryCard.Section>
                    <SummaryCard.NoticeList
                      label="유의사항"
                      items={shippingNoticeItems}
                    />
                  </SummaryCard.Section>
                  <SummaryCard.Section>
                    <Accordion type="single" collapsible size="compact">
                      <AccordionItem value="length-guide">
                        <AccordionTrigger>
                          내게 맞는 넥타이 길이
                        </AccordionTrigger>
                        <AccordionContent>
                          <DataTable
                            headers={["키", "권장 길이"]}
                            data={HEIGHT_GUIDE.map((guide) => ({
                              키: guide.height,
                              "권장 길이": guide.length,
                            }))}
                            size="sm"
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </SummaryCard.Section>
                </SummaryCard>
              }
              actionBar={
                <ShopActionBar
                  onAddToCart={handleAddToCart}
                  onOrder={handleDirectOrder}
                  disabled={isActionDisabled}
                  disabledLabel={
                    uploadTieImagesMutation.isPending
                      ? "업로드 중..."
                      : undefined
                  }
                />
              }
              detail={
                <div className="space-y-5 py-8 lg:py-10">
                  <section className="overflow-hidden -mx-4 sm:-mx-6 lg:mx-0 lg:border lg:border-stone-200 bg-stone-100 aspect-[4/3]">
                    <video
                      src="/images/reform/reform.mov"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </section>

                  <section className="py-4 text-center lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                      Reform Service
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 lg:text-5xl">
                      수동 넥타이를 자동 넥타이로 바꾸거나
                      <br className="hidden lg:block" /> 원하는 폭으로 수선해
                      보세요
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 lg:text-base">
                      사진만 올리면 접수할 수 있어요. 여러 개도 일괄 적용으로
                      빠르게 요청할 수 있습니다.
                    </p>
                  </section>

                  <UtilityPageSection
                    icon={ScissorsIcon}
                    title="진행 방법"
                    description="복잡한 과정 없이 바로 요청할 수 있어요."
                  >
                    <div className="grid gap-3 lg:grid-cols-3">
                      {REFORM_STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                          <div
                            key={step.title}
                            className="rounded-2xl border border-stone-200 bg-white p-4"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-zinc-700" />
                              <h3 className="text-sm font-semibold text-zinc-950">
                                {step.title}
                              </h3>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-600">
                              {step.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </UtilityPageSection>

                  <UtilityPageSection
                    icon={RulerIcon}
                    title="내게 맞는 넥타이 길이"
                    description="착용자의 키를 기준으로 수선 후 권장 길이를 확인하세요."
                  >
                    <DataTable
                      headers={["키", "권장 길이"]}
                      data={HEIGHT_GUIDE.map((guide) => ({
                        키: guide.height,
                        "권장 길이": guide.length,
                      }))}
                      size="sm"
                    />
                  </UtilityPageSection>

                  {IMAGE_SECTIONS.map((section) => (
                    <React.Fragment key={section.title}>
                      <section
                        className={`overflow-hidden -mx-4 sm:-mx-6 lg:mx-0 lg:border lg:border-stone-200 bg-stone-100 ${"aspect" in section ? section.aspect : ""}`}
                      >
                        {"video" in section ? (
                          <video
                            src={section.video}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="min-h-[360px] animate-pulse bg-stone-200/80 py-12 lg:min-h-[560px]" />
                        )}
                      </section>

                      <section className="py-4 text-center lg:py-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                          {section.eyebrow}
                        </p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 lg:text-4xl">
                          {section.title}
                        </h3>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 lg:text-base">
                          {section.description}
                        </p>
                      </section>
                    </React.Fragment>
                  ))}

                  <section className="pt-2 text-center lg:pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                      Basic / Dimple
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 lg:text-4xl">
                      기본과 딤플, 원하는 매듭 인상으로 선택해 보세요
                    </h3>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 lg:text-base">
                      깔끔한 기본 스타일과 입체감 있는 딤플 스타일 중 원하는
                      느낌으로 고를 수 있어요.
                    </p>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    {DIMPLE_CONTENT.map((item) => (
                      <section key={item.label} className="space-y-3">
                        <section className="overflow-hidden -mx-4 sm:-mx-6 lg:mx-0 lg:border lg:border-stone-200 bg-stone-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </section>

                        <section className="py-2 text-center lg:py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                            {item.label}
                          </p>
                          <h4 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 lg:text-2xl">
                            {item.title}
                          </h4>
                          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-600">
                            {item.description}
                          </p>
                        </section>
                      </section>
                    ))}
                  </section>

                  <section className="pt-2 text-center lg:pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                      Width Reform
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 lg:text-4xl">
                      몇 밀리미터 차이가 인상을 바꿉니다
                    </h3>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 lg:text-base">
                      폭 하나만 줄여도 실루엣이 달라지고, 전체 인상이 다르게
                      읽힙니다.
                    </p>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    {BEFORE_AFTER_CONTENT.map((item) => (
                      <section key={item.label} className="space-y-3">
                        <section className="overflow-hidden -mx-4 sm:-mx-6 lg:mx-0 lg:border lg:border-stone-200 bg-stone-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </section>

                        <section className="py-2 text-center lg:py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                            {item.label}
                          </p>
                          <h4 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 lg:text-2xl">
                            {item.title}
                          </h4>
                          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-600">
                            {item.description}
                          </p>
                        </section>
                      </section>
                    ))}
                  </section>
                </div>
              }
            >
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-t border-stone-200 px-0.5 pb-2.5 pt-2">
                  <Field orientation="horizontal" className="w-auto gap-4">
                    <Checkbox
                      id={selectAllCheckboxId}
                      checked={isIndeterminate ? "indeterminate" : isAllChecked}
                      onCheckedChange={handleSelectAll}
                      aria-checked={isIndeterminate ? "mixed" : isAllChecked}
                    />
                    <FieldLabel
                      htmlFor={selectAllCheckboxId}
                      className="cursor-pointer"
                    >
                      <FieldTitle className="text-sm font-medium text-zinc-700">
                        전체 선택
                      </FieldTitle>
                    </FieldLabel>
                  </Field>
                  <div className="flex items-center gap-4 text-sm font-medium text-zinc-700">
                    <Button
                      variant="none"
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (selectedTieIndices.length === 0) {
                          alert("적용할 항목을 선택해주세요.");
                          return;
                        }

                        setCheckedIndicesForBulk(selectedTieIndices);
                        setBulkDialogOpen(true);
                      }}
                    >
                      일괄 적용
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedTieIndices.length === 0) {
                          return;
                        }

                        confirm(
                          "선택한 항목을 삭제하시겠습니까?",
                          handleDelete,
                          {
                            confirmText: "삭제",
                            cancelText: "취소",
                          },
                        );
                      }}
                      variant="none"
                      type="button"
                      size="sm"
                      disabled={selectedTieIndices.length === 0}
                    >
                      삭제
                    </Button>
                  </div>
                </div>

                {fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    <TieItemCard
                      index={index}
                      control={form.control}
                      onRemove={() =>
                        confirm(
                          "정말 삭제하시겠습니까?",
                          () => removeTie(index),
                          {
                            confirmText: "삭제",
                            cancelText: "취소",
                          },
                        )
                      }
                    />
                    {index < fields.length - 1 && <Separator />}
                  </React.Fragment>
                ))}

                {fields.length === 0 && (
                  <Empty
                    title="수선할 넥타이가 없습니다."
                    description="새 항목을 추가해 접수를 시작해주세요."
                  />
                )}

                <div className="flex justify-end py-4">
                  <Button type="button" onClick={addTie}>
                    넥타이 추가
                  </Button>
                </div>
              </div>
            </PageLayout>
          </Form>
          <MobileReformSheet
            open={isPurchaseSheetOpen}
            onOpenChange={setIsPurchaseSheetOpen}
            onAddToCart={handleAddToCart}
            onOrder={handleMobileOrder}
            tieCount={selectedCount}
            totalCost={totalCost ?? 0}
          />
        </MainContent>
      </MainLayout>

      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => !open && setBulkDialogOpen(false)}
      >
        <ResponsiveDialogScaffold
          title="일괄 적용"
          confirmLabel="적용"
          onCancel={() => setBulkDialogOpen(false)}
          onConfirm={async () => {
            const didApply =
              await bulkApplySectionRef.current?.handleBulkApply();
            if (didApply) {
              setBulkDialogOpen(false);
            }
          }}
        >
          <BulkApplySection
            ref={bulkApplySectionRef}
            setValue={form.setValue}
            checkedIndices={checkedIndicesForBulk}
          />
        </ResponsiveDialogScaffold>
      </Dialog>
    </>
  );
};

export default ReformPage;
