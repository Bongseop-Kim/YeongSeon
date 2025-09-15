import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import TieItemCard from "./components/tie-item-card";
import BulkApplySection from "./components/bulk-apply-section";
import type { ReformOptions } from "./types/reform";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useModalStore } from "@/store/modal";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import React, { useEffect, useCallback } from "react";
import { Empty } from "./components/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const ReformPage = () => {
  const { openModal, confirm } = useModalStore();
  const navigate = useNavigate();

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

  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const saveToLocalStorage = useCallback(
    debounce((data: ReformOptions) => {
      if (data.ties && data.ties.length > 0) {
        const reformData = {
          ties: data.ties,
          bulkApply: data.bulkApply,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("reformDraft", JSON.stringify(reformData));
      }
    }, 500),
    [debounce]
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.ties && value.ties.length > 0) {
        saveToLocalStorage(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch, saveToLocalStorage]);

  useEffect(() => {
    const savedData = localStorage.getItem("reformDraft");
    if (savedData) {
      try {
        const reformData = JSON.parse(savedData);
        const savedTime = new Date(reformData.timestamp);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          openModal({
            title: "데이터 복구",
            description:
              "이전에 작성하던 수선 정보가 있습니다.\n복구하시겠습니까?",
            confirmText: "복구",
            cancelText: "새로 작성",
            onConfirm: () => {
              form.reset(reformData);
              localStorage.removeItem("reformDraft");
            },
            onCancel: () => {
              localStorage.removeItem("reformDraft");
            },
          });
        } else {
          localStorage.removeItem("reformDraft");
        }
      } catch (error) {
        localStorage.removeItem("reformDraft");
      }
    }
  }, [confirm, form]);

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

  const handleDirectOrder = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.removeItem("reformDraft");
    localStorage.setItem(
      "reformOrderData",
      JSON.stringify({
        ...watchedValues,
        timestamp: new Date().toISOString(),
        totalCost: calculateEstimatedCost() + 3000,
      })
    );

    navigate("/order-form");
  };

  // 간단한 비용 계산 (실제로는 더 복잡한 로직이 필요)
  const calculateEstimatedCost = () => {
    const baseCost = 15000; // 기본 수선 비용
    const tieCount = fields.length;
    return baseCost * tieCount;
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
      <MainContent className="bg-stone-100 overflow-visible">
        <Form {...form}>
          <TwoPanelLayout
            title="자동 넥타이 수선"
            leftPanel={
              <Card>
                <CardContent className="flex items-center justify-between">
                  <div className="flex gap-6 items-center">
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
                          alert("적용할 항목을 선택해주세요.");
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
            stickyRight
            rightPanel={
              <div className="space-y-4">
                {/* 주문 요약 */}
                <Card>
                  <CardHeader>
                    <CardTitle>구매 금액</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">수량 x 비용</span>
                        <span className="font-medium">
                          {fields.length}개 x 15,000원
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">배송비</span>
                        <span className="font-medium">3,000원</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>총 비용</span>
                        <span>
                          {(calculateEstimatedCost() + 3000).toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>유의사항</AccordionTrigger>
                        <AccordionContent className="text-stone-600">
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
                  </CardContent>
                </Card>

                {/* 주문 버튼 */}
                <Button
                  type="button"
                  onClick={handleDirectOrder}
                  size="lg"
                  className="w-full"
                >
                  구매하기
                </Button>
              </div>
            }
          />
        </Form>
      </MainContent>
    </MainLayout>
  );
};

export default ReformPage;
