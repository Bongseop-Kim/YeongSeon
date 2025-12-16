import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import TieItemCard from "./components/tie-item-card";
import BulkApplySection from "../../components/composite/bulk-apply-section";
import type { ReformOptions } from "./types/reform";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useModalStore } from "@/store/modal";
import { useCartStore } from "@/store/cart";
import { useOrderStore } from "@/store/order";
import type { CartItem } from "@/types/cart";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import React, { useState } from "react";
import { Empty } from "../../components/composite/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Detail } from "./components/detail";
import { HEIGHT_GUIDE } from "./constants/DETAIL";
import { REFORM_BASE_COST, REFORM_SHIPPING_COST } from "./constants/COST";
import { DataTable } from "@/components/ui/data-table";
import { ReformActionButtons } from "./components/reform-action-buttons";
import { MobileReformSheet } from "./components/mobile-reform-sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { generateItemId } from "@/lib/utils";

const ReformPage = () => {
  const { openModal, confirm } = useModalStore();
  const { addReformToCart } = useCartStore();
  const { setOrderItems } = useOrderStore();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);

  const form = useForm<ReformOptions>({
    defaultValues: {
      ties: [
        {
          id: "tie-1",
          image: undefined,
          measurementType: "length",
          tieLength: undefined,
          wearerHeight: undefined,
          checked: false,
        },
      ],
      bulkApply: {
        measurementType: "length",
        tieLength: undefined,
        wearerHeight: undefined,
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ties",
  });

  const watchedValues = form.watch();

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

  const validateTies = (): { isValid: boolean; message?: string } => {
    if (fields.length === 0) {
      return { isValid: false, message: "수선할 넥타이를 추가해주세요." };
    }

    for (let i = 0; i < watchedValues.ties.length; i++) {
      const tie = watchedValues.ties[i];

      if (!tie.measurementType) {
        return {
          isValid: false,
          message: `${i + 1}번째 넥타이의 측정 방식을 선택해주세요.`,
        };
      }

      if (tie.measurementType === "length" && !tie.tieLength) {
        return {
          isValid: false,
          message: `${i + 1}번째 넥타이의 길이를 입력해주세요.`,
        };
      }

      if (tie.measurementType === "height" && !tie.wearerHeight) {
        return {
          isValid: false,
          message: `${i + 1}번째 넥타이의 착용자 키를 입력해주세요.`,
        };
      }
    }

    return { isValid: true };
  };

  const handleDirectOrder = () => {
    const validation = validateTies();
    if (!validation.isValid) {
      confirm(validation.message || "입력값을 확인해주세요.");
      return;
    }

    if (isMobile) {
      setIsPurchaseSheetOpen(true);
      return;
    }

    // ReformOptions를 CartItem[]로 변환
    const orderItems: CartItem[] = watchedValues.ties.map((tie) => ({
      id: generateItemId("reform", tie.id),
      type: "reform",
      quantity: 1,
      reformData: {
        tie: tie,
        cost: REFORM_BASE_COST,
      },
    }));

    setOrderItems(orderItems);
    navigate(ROUTES.ORDER_FORM);
  };

  const handleMobileOrder = () => {
    const validation = validateTies();
    if (!validation.isValid) {
      confirm(validation.message || "입력값을 확인해주세요.");
      return;
    }

    // ReformOptions를 CartItem[]로 변환
    const orderItems: CartItem[] = watchedValues.ties.map((tie) => ({
      id: generateItemId("reform", tie.id),
      type: "reform",
      quantity: 1,
      reformData: {
        tie: tie,
        cost: REFORM_BASE_COST,
      },
    }));

    setOrderItems(orderItems);
    navigate(ROUTES.ORDER_FORM);
  };

  const handleAddToCart = () => {
    const validation = validateTies();
    if (!validation.isValid) {
      confirm(validation.message || "입력값을 확인해주세요.");
      return;
    }

    // 각 넥타이를 개별적으로 장바구니에 추가 (배송비는 주문당 한 번만 적용)
    watchedValues.ties.forEach((tie) => {
      addReformToCart({
        tie: tie,
        cost: REFORM_BASE_COST,
      });
    });

    // 폼 초기화
    form.reset({
      ties: [
        {
          id: "tie-1",
          image: undefined,
          measurementType: "length",
          tieLength: undefined,
          wearerHeight: undefined,
          checked: false,
        },
      ],
      bulkApply: {
        measurementType: "length",
        tieLength: undefined,
        wearerHeight: undefined,
      },
    });
  };

  // 간단한 비용 계산 (실제로는 더 복잡한 로직이 필요)
  const calculateEstimatedCost = () => {
    const tieCount = fields.length;
    return REFORM_BASE_COST * tieCount;
  };

  const handleDelete = () => {
    const checkedIndices = watchedValues.ties
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

  const isAllChecked = watchedValues.ties.every((tie) => tie.checked);

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <Form {...form}>
          <TwoPanelLayout
            detail={<Detail />}
            leftPanel={
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
                        let bulkApplySectionRef: {
                          handleBulkApply: () => void;
                        } | null = null;

                        const checkedIndices = watchedValues.ties
                          .map((tie, index) => (tie.checked ? index : -1))
                          .filter((index) => index !== -1);

                        if (checkedIndices.length === 0) {
                          confirm("적용할 항목을 선택해주세요.");
                          return;
                        }

                        openModal({
                          title: "일괄 적용",
                          children: (
                            <BulkApplySection
                              ref={(ref) => {
                                bulkApplySectionRef = ref;
                              }}
                              setValue={form.setValue}
                              checkedIndices={checkedIndices}
                            />
                          ),
                          confirmText: "적용",
                          cancelText: "취소",
                          onConfirm: () => {
                            bulkApplySectionRef?.handleBulkApply();
                          },
                        });
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
                          }
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
                  <React.Fragment key={`${field.id}-${index}`}>
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
                          }
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
            }
            rightPanel={
              <Card>
                <CardHeader>
                  <CardTitle>구매 금액</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>총 {fields.length}개</span>
                      <span>{calculateEstimatedCost().toLocaleString()}원</span>
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
                            • 넥타이 확인 후 수선 진행 상태에서는 취소 및 환불이
                            불가능합니다.
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
              </Card>
            }
            button={
              <ReformActionButtons
                onAddToCart={handleAddToCart}
                onOrder={handleDirectOrder}
              />
            }
          />
        </Form>
        <MobileReformSheet
          open={isPurchaseSheetOpen}
          onOpenChange={setIsPurchaseSheetOpen}
          onAddToCart={handleAddToCart}
          onOrder={handleMobileOrder}
          tieCount={fields.length}
          totalCost={calculateEstimatedCost() + REFORM_SHIPPING_COST}
        />
      </MainContent>
    </MainLayout>
  );
};

export default ReformPage;
