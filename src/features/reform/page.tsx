import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import TieItemCard from "./components/tie-item-card";
import BulkApplySection from "./components/bulk-apply-section";
import type { ReformOptions } from "./types/reform";
import TwoPanelLayout from "@/components/layout/TwoPanelLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useModalStore } from "@/store/modal";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import React from "react";
import { Empty } from "./components/empty";

const ReformPage = () => {
  const { openModal, confirm } = useModalStore();

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
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = (data: ReformOptions) => {
    console.log("Reform order submitted:", data);
    // 수선 주문 제출 로직
  };

  const handleDirectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Direct reform order:", watchedValues);
    // 바로 주문 로직
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
        <div className="max-w-6xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TwoPanelLayout
                leftPanel={
                  <Card>
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

                    <Separator />

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
                          onRemove={() => removeTie(index)}
                          showRemoveButton={fields.length > 1}
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
                  </Card>
                }
                stickyRight
                rightPanel={
                  <div className="space-y-4">
                    {/* 주문 요약 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>주문 요약</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-600">수량 x 비용</span>
                            <span className="font-medium">
                              {fields.length}개 x 15,000원
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>총 비용</span>
                            <span>
                              {calculateEstimatedCost().toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 주문 버튼 */}
                    <Button
                      type="button"
                      onClick={handleDirectOrder}
                      size="lg"
                      className="w-full"
                    >
                      수선 주문하기
                    </Button>
                  </div>
                }
              />
            </form>
          </Form>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default ReformPage;
