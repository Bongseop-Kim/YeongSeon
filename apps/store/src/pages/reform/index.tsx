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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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
import { TieLengthGuideAccordion } from "@/shared/composite/tie-length-guide-accordion";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { OrderSummaryAside } from "@/shared/composite/order-summary-aside";
import { ShopActionBar } from "@/shared/composite/shop-action-bar";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { PageSeo } from "@/shared/ui/page-seo";
import { analytics } from "@/shared/lib/analytics";

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
    title: "수동 넥타이, 자동 넥타이로 바꿔보세요",
    description: "지퍼 구조로 더 빠르고 간편하게 착용",
    imageLabel: "자동 전환 이미지",
  },
  {
    eyebrow: "Width Reform",
    title: "넥타이 폭, 지금 취향에 맞게",
    description: "넓은 폭도 더 슬림하고 깔끔하게",
    imageLabel: "폭 수선 이미지",
  },
  {
    eyebrow: "Bulk Apply",
    title: "여러 개 맡겨도 어렵지 않아요",
    description: "일괄 적용으로 한 번에 같은 요청 전달",
    imageLabel: "일괄 적용 이미지",
  },
] as const;

const DIMPLE_CONTENT = [
  {
    label: "Basic",
    title: "기본",
    description: "매끈하고 단정한 매듭 느낌",
    imageLabel: "기본 자동 넥타이 이미지",
  },
  {
    label: "Dimple",
    title: "딤플",
    description: "중앙 홈이 살아 있는 입체감",
    imageLabel: "딤플 자동 넥타이 이미지",
  },
] as const;

const BEFORE_AFTER_CONTENT = [
  {
    label: "Before",
    title: "수동 넥타이",
    description: "손으로 직접 매듭을 묶어 착용",
  },
  {
    label: "After",
    title: "자동 넥타이 또는 폭수선 후",
    description: "더 편하게, 더 지금 같은 인상으로",
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
            "수선 비용 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
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
  const tieRows = selectedTies.map(({ tie, index }) => {
    const services = [
      tie.hasLengthReform !== false ? "자동수선" : null,
      tie.hasWidthReform === true ? "폭수선" : null,
    ]
      .filter((s): s is string => s !== null)
      .join(" · ");
    const tieCost =
      hasValidPricing && pricing ? calcTieCost(tie, pricing) : undefined;
    return {
      id: `tie-${index}`,
      label: `항목 ${index + 1}`,
      value: tieCost !== undefined ? formatCost(tieCost) : services || "-",
    };
  });
  const estimatedShipping =
    hasValidPricing && selectedCount > 0 && pricing
      ? pricing.shippingCost
      : undefined;
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
        description="수동 넥타이를 자동 넥타이로 바꾸거나 원하는 폭으로 수선해 보세요. 사진 첨부와 일괄 적용으로 여러 개도 쉽게 접수할 수 있습니다."
        ogUrl="https://essesion.shop/reform"
      />
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              contentClassName="pt-0"
              sidebar={
                <OrderSummaryAside
                  icon={ReceiptTextIcon}
                  title="접수 요약"
                  description="현재 접수 수량과 예상 결제를 확인합니다."
                  rows={[
                    ...tieRows,
                    {
                      id: "selected-count",
                      label: "수선 수량",
                      value: `총 ${selectedCount}개`,
                    },
                    {
                      id: "shipping-cost",
                      label: "예상 배송비",
                      value: formatCost(estimatedShipping),
                    },
                    {
                      id: "total-cost",
                      label: "예상 결제",
                      value: formatCost(totalCost),
                      className: "pt-4",
                    },
                    {
                      id: "estimated-days",
                      label: "예상 수선 기간",
                      value: "7~14일",
                    },
                  ]}
                  footer={
                    <TieLengthGuideAccordion
                      notices={[
                        "제주/도서산간 지역은 배송비 3,000원이 추가됩니다.",
                        "예상 수선 기간은 영업일 기준 7~14일입니다.",
                        "접수 이후에는 취소 및 환불이 불가능합니다.",
                        "접수 전 취소 시 택배비 3,000원을 제외하고 환불됩니다.",
                      ]}
                      className="mt-4"
                    />
                  }
                />
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
                  <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
                    <div className="min-h-[420px] animate-pulse bg-stone-200/80 py-12 lg:min-h-[620px]" />
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

                  {IMAGE_SECTIONS.map((section) => (
                    <React.Fragment key={section.title}>
                      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
                        <div className="min-h-[360px] animate-pulse bg-stone-200/80 py-12 lg:min-h-[560px]" />
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
                        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
                          <div className="min-h-[320px] animate-pulse bg-stone-200/80 py-12 lg:min-h-[480px]" />
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
                      Before / After
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 lg:text-4xl">
                      같은 넥타이도 이렇게 달라질 수 있어요
                    </h3>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    {BEFORE_AFTER_CONTENT.map((item) => (
                      <section key={item.label} className="space-y-3">
                        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
                          <div className="min-h-[320px] animate-pulse bg-stone-200/80 py-12 lg:min-h-[480px]" />
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
                <UtilityPageIntro
                  eyebrow="Reform"
                  title="넥타이 수선 접수"
                  description="사진만 준비해 주세요. 수동 넥타이를 자동 넥타이로 바꾸거나 원하는 폭으로 수선할 수 있어요."
                  className="pb-4 lg:pb-5"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2">
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
                      <FieldTitle className="text-foreground">
                        전체 선택
                      </FieldTitle>
                    </FieldLabel>
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
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
                      variant="outline"
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

                <div className="flex justify-end border-t border-border py-3">
                  <Button
                    type="button"
                    onClick={addTie}
                    variant="outline"
                    size="sm"
                  >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 적용</DialogTitle>
          </DialogHeader>
          <BulkApplySection
            ref={bulkApplySectionRef}
            setValue={form.setValue}
            checkedIndices={checkedIndicesForBulk}
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setBulkDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                const didApply =
                  await bulkApplySectionRef.current?.handleBulkApply();
                if (didApply) {
                  setBulkDialogOpen(false);
                }
              }}
            >
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReformPage;
