import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TieItemCard from "./components/tie-item-card";
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
import React, { useCallback, useRef, useState } from "react";
import { Empty } from "@/components/composite/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Detail } from "./components/detail";
import { HEIGHT_GUIDE } from "@/constants/HEIGHT_GUIDE";
import { DataTable } from "@/components/ui/data-table";
import { ReformActionButtons } from "./components/reform-action-buttons";
import { MobileReformSheet } from "./components/mobile-reform-sheet";
import { ConsentCheckbox } from "@/components/composite/consent-checkbox";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { toReformCartItems, toReformData } from "./api/reform-mapper";
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
  const { confirm } = useModalStore();
  const { addMultipleReformToCart } = useCart();
  const { setOrderItems } = useOrderStore();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
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

  const watchedTies = form.watch("ties");

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

  const processReformOrder = useCallback(async () => {
    const ties = form.getValues().ties;
    const uploadedTies = await uploadTiesIfNeeded(ties);

    const orderItems = toReformCartItems(uploadedTies, pricing?.baseCost ?? 0);

    setOrderItems(orderItems);
    navigate(ROUTES.ORDER_FORM);
  }, [form, navigate, pricing?.baseCost, setOrderItems, uploadTiesIfNeeded]);

  const withSubmitGuard = useCallback(
    async (action: () => Promise<void>) => {
      if (isSubmittingRef.current) return;
      if (fields.length === 0) {
        confirm("수선할 넥타이를 추가해주세요.");
        return;
      }
      isSubmittingRef.current = true;
      const isValid = await form.trigger("ties");
      if (!isValid) {
        isSubmittingRef.current = false;
        return;
      }
      try {
        await action();
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [fields.length, confirm, form],
  );

  const handleDirectOrder = () =>
    withSubmitGuard(async () => {
      if (isMobile) {
        setIsPurchaseSheetOpen(true);
        return;
      }
      await processReformOrder();
    });

  const handleMobileOrder = () => withSubmitGuard(processReformOrder);

  const handleAddToCart = () =>
    withSubmitGuard(async () => {
      const ties = form.getValues().ties;
      const uploadedTies = await uploadTiesIfNeeded(ties);

      await addMultipleReformToCart(
        uploadedTies.map((tie) => toReformData(tie, pricing?.baseCost ?? 0)),
      );

      form.reset(DEFAULT_REFORM_OPTIONS);
    });

  const calculateTotalCost = () =>
    fields.length === 0
      ? 0
      : (pricing?.baseCost ?? 0) * fields.length + (pricing?.shippingCost ?? 0);

  const handleDelete = () => {
    const checkedIndices = watchedTies
      .map((tie, index) => (tie.checked ? index : -1))
      .filter((index) => index !== -1)
      .sort((a, b) => b - a);

    checkedIndices.forEach((index) => {
      remove(index);
    });
  };

  const handleSelectAll = (checked: boolean) => {
    fields.forEach((_, index) => {
      form.setValue(`ties.${index}.checked`, checked);
    });
  };

  const isAllChecked =
    watchedTies.length > 0 && watchedTies.every((tie) => tie.checked);

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <Form {...form}>
            <PageLayout
              detail={<Detail />}
              sidebar={
                <Card>
                  <CardHeader>
                    <CardTitle>구매 금액</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>총 {fields.length}개</span>
                        <span>{calculateTotalCost().toLocaleString()}원</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="item-1">
                          <AccordionTrigger>
                            내게 맞는 넥타이 길이
                          </AccordionTrigger>
                          <AccordionContent className="text-zinc-600">
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

                      <Accordion type="single" collapsible>
                        <AccordionItem value="item-1">
                          <AccordionTrigger>유의사항</AccordionTrigger>
                          <AccordionContent className="text-zinc-600">
                            <p>
                              • 제주/도서산간 지역 배송 시 추가 배송비 3,000원이
                              부과됩니다.
                            </p>
                            <p>
                              • 예상 수선 기간은 넥타이 확인 후 영업일 기준
                              10일입니다.
                            </p>
                            <p>
                              • 넥타이 확인 후 수선 진행 상태에서는 취소 및
                              환불이 불가능합니다.
                            </p>
                            <p>
                              • 수선 진행 전 취소 시, 택배비 3,000원을 제외한
                              금액을 환불해드립니다.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                  <ConsentCheckbox
                    id="cancellation-consent"
                    checked={cancellationConsent}
                    onCheckedChange={setCancellationConsent}
                    label="취소/환불 불가 동의"
                    description="판매자가 수선물을 수령(접수)한 이후부터 취소 및 환불이 불가능합니다."
                    required
                    className="px-6 pb-6"
                  />
                </Card>
              }
              actionBar={
                <ReformActionButtons
                  onAddToCart={handleAddToCart}
                  onOrder={handleDirectOrder}
                  disabled={
                    !cancellationConsent ||
                    uploadTieImagesMutation.isPending ||
                    !pricing
                  }
                  isUploading={uploadTieImagesMutation.isPending}
                />
              }
            >
              <Card>
                <CardContent className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <Checkbox
                      checked={isAllChecked}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label className="text-md">전체 선택</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      onClick={() => {
                        const checkedIndices = watchedTies
                          .map((tie, index) => (tie.checked ? index : -1))
                          .filter((index) => index !== -1);

                        if (checkedIndices.length === 0) {
                          confirm("적용할 항목을 선택해주세요.");
                          return;
                        }

                        setCheckedIndicesForBulk(checkedIndices);
                        setBulkDialogOpen(true);
                      }}
                    >
                      일괄 적용
                    </Button>
                    <Button
                      onClick={() =>
                        confirm(
                          "선택한 항목을 삭제하시겠습니까?",
                          handleDelete,
                          {
                            confirmText: "삭제",
                            cancelText: "취소",
                          },
                        )
                      }
                      variant="outline"
                      type="button"
                      size="sm"
                    >
                      삭제
                    </Button>
                  </div>
                </CardContent>
                <Separator />

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
                    description="수선할 넥타이를 추가해주세요."
                  />
                )}

                <Separator />
                <CardContent className="flex justify-end ">
                  <Button
                    type="button"
                    onClick={addTie}
                    variant="outline"
                    size="sm"
                  >
                    넥타이 추가
                  </Button>
                </CardContent>
              </Card>
            </PageLayout>
          </Form>
          <MobileReformSheet
            open={isPurchaseSheetOpen}
            onOpenChange={setIsPurchaseSheetOpen}
            cancellationConsent={cancellationConsent}
            onCancellationConsentChange={setCancellationConsent}
            onAddToCart={handleAddToCart}
            onOrder={handleMobileOrder}
            tieCount={fields.length}
            totalCost={calculateTotalCost()}
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
