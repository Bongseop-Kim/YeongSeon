import { useForm, useFieldArray } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Calculator } from "lucide-react";
import TieItemCard from "../components/TieItemCard";
import BulkApplySection from "../components/BulkApplySection";
import type { ReformOptions } from "../types/reform";

const ReformPage = () => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReformOptions>({
    defaultValues: {
      ties: [
        {
          id: "tie-1",
          image: undefined,
          tieLength: undefined,
          wearerHeight: undefined,
        },
      ],
      bulkApply: {
        currentMeasurementType: "length",
        tieLength: undefined,
        wearerHeight: undefined,
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ties",
  });

  const watchedValues = watch();

  const addTie = () => {
    append({
      id: `tie-${Date.now()}`,
      image: undefined,
      tieLength: undefined,
      wearerHeight: undefined,
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

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-6xl mx-auto py-8 px-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽: 수선 주문 폼 */}
              <div className="lg:col-span-2">
                <div className="space-y-8">
                  {/* 넥타이 목록 */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-stone-900">
                        수선할 넥타이 목록
                      </h2>
                      <Button
                        type="button"
                        onClick={addTie}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        넥타이 추가
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {fields.map((field, index) => (
                        <TieItemCard
                          key={field.id}
                          index={index}
                          control={control}
                          onRemove={() => removeTie(index)}
                          showRemoveButton={fields.length > 1}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 주문 요약 */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  {/* 일괄 적용 섹션 */}
                  <BulkApplySection
                    control={control}
                    setValue={setValue}
                    tieCount={fields.length}
                  />

                  {/* 주문 요약 */}
                  <Card className="border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-stone-900 flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-stone-600" />
                        주문 요약
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">수선할 넥타이</span>
                          <span className="font-medium">{fields.length}개</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">기본 수선비</span>
                          <span className="font-medium">
                            {(15000 * fields.length).toLocaleString()}원
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>총 비용</span>
                          <span className="text-stone-900">
                            {calculateEstimatedCost().toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 주문 버튼 */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={handleDirectOrder}
                      size="lg"
                      className="w-full h-12 text-base font-medium bg-stone-900 hover:bg-stone-800"
                    >
                      수선 주문하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default ReformPage;
