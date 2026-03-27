import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ReceiptTextIcon } from "lucide-react";
import { ROUTES } from "@/constants/ROUTES";
import { Button } from "@/components/ui-extended/button";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TieItemCard from "@/features/reform/components/tie-item-card";
import BulkApplySection, {
  type BulkApplySectionRef,
} from "@/components/composite/bulk-apply-section";
import type { ReformOptions } from "@yeongseon/shared/types/view/reform";
import { PageLayout } from "@/components/layout/page-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useModalStore } from "@/store/modal";
import { useCart } from "@/features/cart/hooks/useCart";
import { useOrderStore } from "@/store/order";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Empty } from "@/components/composite/empty";
import { TieLengthGuideAccordion } from "@/components/composite/tie-length-guide-accordion";
import { MobileReformSheet } from "@/features/reform/components/mobile-reform-sheet";
import { UtilityPageIntro } from "@/components/composite/utility-page";
import { OrderSummaryAside } from "@/components/composite/order-summary-aside";
import { ShopActionBar } from "@/components/composite/shop-action-bar";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import {
  toReformCartItems,
  toReformData,
} from "@/features/reform/api/reform-mapper";
import { useReformPricing, useUploadTieImages } from "./api/reform-query";

const DEFAULT_TIE_ITEM = {
  id: "tie-1",
  image: undefined,
  measurementType: "length" as const,
  tieLength: undefined,
  wearerHeight: undefined,
  checked: false,
};

const DEFAULT_REFORM_OPTIONS: ReformOptions = {
  ties: [DEFAULT_TIE_ITEM],
  bulkApply: {
    measurementType: "length",
    tieLength: undefined,
    wearerHeight: undefined,
  },
};

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
      measurementType: "length",
      tieLength: undefined,
      wearerHeight: undefined,
      checked: false,
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

  const selectedTieIndices = useMemo(
    () =>
      watchedTies
        .map((tie, index) => (tie.checked ? index : -1))
        .filter((index) => index !== -1),
    [watchedTies],
  );

  const getSelectedTiesSnapshot = useCallback(() => {
    const ties = form.getValues("ties");
    const selectedIndices: number[] = [];
    const selectedTies: ReformOptions["ties"] = [];
    ties.forEach((tie, index) => {
      if (tie.checked) {
        selectedIndices.push(index);
        selectedTies.push(tie);
      }
    });
    return { selectedIndices, selectedTies };
  }, [form]);

  const hasValidPricing =
    Number.isFinite(pricing?.baseCost) &&
    Number.isFinite(pricing?.shippingCost);

  const withSubmitGuard = useCallback(
    async (
      action: (
        baseCost: number,
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
        await action(pricing.baseCost, selectedTies);
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
    withSubmitGuard(async (baseCost, selectedTies) => {
      if (isMobile) {
        setIsPurchaseSheetOpen(true);
        return;
      }

      const uploadedTies = await uploadTiesIfNeeded(selectedTies);
      const orderItems = toReformCartItems(uploadedTies, baseCost);
      setOrderItems(orderItems);
      navigate(ROUTES.ORDER_FORM);
    });

  const handleMobileOrder = () =>
    withSubmitGuard(async (baseCost, selectedTies) => {
      const uploadedTies = await uploadTiesIfNeeded(selectedTies);
      const orderItems = toReformCartItems(uploadedTies, baseCost);
      setOrderItems(orderItems);
      navigate(ROUTES.ORDER_FORM);
    });

  const handleAddToCart = () =>
    withSubmitGuard(async (baseCost, selectedTies) => {
      const uploadedTies = await uploadTiesIfNeeded(selectedTies);

      await addMultipleReformToCart(
        uploadedTies.map((tie) => toReformData(tie, baseCost)),
      );

      form.reset(DEFAULT_REFORM_OPTIONS);
      setIsPurchaseSheetOpen(false);
    });

  const formatCost = (cost: number | undefined, suffix = "원") =>
    cost !== undefined ? `${cost.toLocaleString()}${suffix}` : "-";

  const selectedCount = selectedTieIndices.length;
  const baseCost = hasValidPricing && pricing ? pricing.baseCost : undefined;
  const estimatedShipping =
    selectedCount > 0 && pricing ? pricing.shippingCost : undefined;
  const totalCost =
    selectedCount > 0 && pricing && baseCost !== undefined
      ? baseCost * selectedCount + pricing.shippingCost
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
    uploadTieImagesMutation.isPending ||
    !hasValidPricing;

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              sidebar={
                <OrderSummaryAside
                  icon={ReceiptTextIcon}
                  title="접수 요약"
                  description="현재 접수 수량과 예상 결제를 확인합니다."
                  rows={[
                    {
                      id: "selected-count",
                      label: "수선 수량",
                      value: `총 ${selectedCount}개`,
                    },
                    {
                      id: "base-cost",
                      label: "기본 수선비",
                      value: formatCost(baseCost, "원 / 개"),
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
                  ]}
                  footer={
                    <TieLengthGuideAccordion
                      notices={[
                        "제주/도서산간 지역은 배송비 3,000원이 추가됩니다.",
                        "예상 수선 기간은 넥타이 확인 후 영업일 기준 10일입니다.",
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
            >
              <div>
                <UtilityPageIntro
                  eyebrow="Reform"
                  title="넥타이 수선 접수"
                  description="사진과 길이 정보만 입력하면 바로 접수를 진행할 수 있습니다."
                  className="pb-4 lg:pb-5"
                />

                <div className="px-4 lg:px-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 py-2">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id={selectAllCheckboxId}
                        checked={
                          isIndeterminate ? "indeterminate" : isAllChecked
                        }
                        onCheckedChange={handleSelectAll}
                        aria-checked={isIndeterminate ? "mixed" : isAllChecked}
                      />
                      <Label
                        htmlFor={selectAllCheckboxId}
                        className="cursor-pointer text-sm font-medium text-zinc-900"
                      >
                        전체 선택
                      </Label>
                    </div>
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

                  <div className="flex justify-end border-t border-stone-200 py-3">
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
