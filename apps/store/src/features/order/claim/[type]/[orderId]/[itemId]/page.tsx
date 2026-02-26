import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import type { ClaimType } from "@yeongseon/shared/types/view/claim-item";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { Form } from "@/components/ui/form";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuantitySelector } from "@/components/composite/quantity-selector";
import { ROUTES } from "@/constants/ROUTES";
import { toast } from "@/lib/toast";
import { Empty } from "@/components/composite/empty";
import { useOrderDetail } from "@/features/order/api/order-query";
import { useCreateClaim } from "@/features/order/api/claims-query";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { useEffect, useMemo } from "react";

// 클레임 사유 옵션
const getClaimReasons = (type: ClaimType) => {
  switch (type) {
    case "cancel":
      return [
        { value: "change_mind", label: "단순 변심" },
        { value: "defect", label: "상품 불량" },
        { value: "delay", label: "배송 지연" },
        { value: "wrong_item", label: "다른 상품 배송" },
        { value: "other", label: "기타" },
      ];
    case "return":
      return [
        { value: "change_mind", label: "단순 변심" },
        { value: "defect", label: "상품 불량" },
        { value: "size_mismatch", label: "사이즈 불일치" },
        { value: "color_mismatch", label: "색상 불일치" },
        { value: "wrong_item", label: "다른 상품 배송" },
        { value: "other", label: "기타" },
      ];
    case "exchange":
      return [
        { value: "size_mismatch", label: "사이즈 불일치" },
        { value: "color_mismatch", label: "색상 불일치" },
        { value: "defect", label: "상품 불량" },
        { value: "wrong_item", label: "다른 상품 배송" },
        { value: "other", label: "기타" },
      ];
    default:
      return [];
  }
};

const VALID_CLAIM_TYPES = ["cancel", "return", "exchange"];

interface ClaimFormData {
  reason: string;
  description: string;
  quantity: number;
}

const ClaimFormPage = () => {
  const { type, orderId, itemId } = useParams<{
    type: ClaimType;
    orderId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const createClaimMutation = useCreateClaim();

  const isValidType = !!type && VALID_CLAIM_TYPES.includes(type);
  const { order, isLoading, isError, error, isNotFound } = useOrderDetail(
    isValidType ? orderId : undefined,
  );

  const orderItem = useMemo(
    () => order?.items.find((item) => item.id === itemId) ?? null,
    [order, itemId],
  );

  const form = useForm<ClaimFormData>({
    defaultValues: {
      reason: "",
      description: "",
      quantity: 1,
    },
  });

  // 주문 아이템 로드 시 수량 기본값 설정
  useEffect(() => {
    if (orderItem) {
      form.setValue("quantity", orderItem.quantity);
    }
  }, [orderItem, form]);

  // 유효하지 않은 클레임 타입
  if (!type || !orderId || !itemId || !isValidType) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="잘못된 접근입니다."
              description="올바른 경로로 접근해주세요."
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">주문 정보를 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="주문 정보를 불러올 수 없습니다."
              description={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (isNotFound || !order) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="주문을 찾을 수 없습니다."
              description="존재하지 않는 주문이거나 접근 권한이 없습니다."
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (!orderItem) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="주문 상품을 찾을 수 없습니다."
              description="해당 상품이 주문에 포함되어 있지 않습니다."
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  const claimTypeLabel = getClaimTypeLabel(type);
  const reasons = getClaimReasons(type);

  const handleSubmit = (data: ClaimFormData) => {
    createClaimMutation.mutate(
      {
        type,
        orderId: orderId!,
        itemId: itemId!,
        reason: data.reason,
        description: data.description || undefined,
        quantity: data.quantity,
      },
      {
        onSuccess: () => {
          toast.success(`${claimTypeLabel} 신청이 완료되었습니다.`);
          navigate(ROUTES.CLAIM_LIST);
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : "오류가 발생했습니다.";
          toast.error(`${claimTypeLabel} 신청 실패: ${message}`);
        },
      },
    );
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout
          sidebar={
            <Card>
              <CardHeader>
                <CardTitle>안내사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-600">
                {type === "cancel" && (
                  <>
                    <div>
                      <p className="font-semibold mb-1">취소 안내</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>주문 취소는 배송 전에만 가능합니다.</li>
                        <li>결제 취소는 영업일 기준 3-5일 소요됩니다.</li>
                        <li>이미 배송이 시작된 경우 취소가 불가능합니다.</li>
                      </ul>
                    </div>
                  </>
                )}
                {type === "return" && (
                  <>
                    <div>
                      <p className="font-semibold mb-1">반품 안내</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>반품은 상품 수령 후 7일 이내에 신청 가능합니다.</li>
                        <li>
                          상품이 사용되거나 훼손된 경우 반품이 불가능합니다.
                        </li>
                        <li>
                          반품 배송비는 고객 부담입니다. (단순 변심의 경우)
                        </li>
                        <li>상품 불량의 경우 배송비는 판매자 부담입니다.</li>
                      </ul>
                    </div>
                  </>
                )}
                {type === "exchange" && (
                  <>
                    <div>
                      <p className="font-semibold mb-1">교환 안내</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>교환은 상품 수령 후 7일 이내에 신청 가능합니다.</li>
                        <li>교환 배송비는 고객 부담입니다.</li>
                        <li>
                          교환 가능한 재고가 있는 경우에만 교환이 가능합니다.
                        </li>
                        <li>
                          상품이 사용되거나 훼손된 경우 교환이 불가능합니다.
                        </li>
                      </ul>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <p className="font-semibold mb-1">문의</p>
                  <p className="text-xs">
                    추가 문의사항이 있으시면 고객센터로 연락해주세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          }
        >
            <Card>
              {/* 헤더 */}
              <CardHeader>
                <CardTitle>{claimTypeLabel} 신청</CardTitle>
                <div className="text-sm text-zinc-500 mt-1">
                  주문번호: {order.orderNumber}
                </div>
                <div className="text-sm text-zinc-500">
                  주문일시: {formatDate(order.date)}
                </div>
              </CardHeader>

              <CardContent>
                <Separator />
              </CardContent>

              {/* 주문 상품 정보 */}
              <CardHeader>
                <CardTitle>주문 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderItemCard
                  item={orderItem}
                  showQuantity={true}
                  showPrice={true}
                />
              </CardContent>

              <CardContent>
                <Separator />
              </CardContent>

              {/* 클레임 신청 폼 */}
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-6"
                  >
                    {/* 수량 선택 (수량이 1개보다 많은 경우에만 표시) */}
                    {orderItem.quantity > 1 && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          <span className="text-red-500">*</span>수량 선택
                        </Label>
                        <Controller
                          name="quantity"
                          control={form.control}
                          rules={{
                            required: "수량을 선택해주세요.",
                            min: {
                              value: 1,
                              message: "최소 1개 이상 선택해주세요.",
                            },
                            max: {
                              value: orderItem.quantity,
                              message: `최대 ${orderItem.quantity}개까지 선택 가능합니다.`,
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-zinc-600">
                                    전체 수량: {orderItem.quantity}개
                                  </span>
                                </div>
                                <QuantitySelector
                                  value={field.value}
                                  onChange={field.onChange}
                                  min={1}
                                  max={orderItem.quantity}
                                />
                              </div>
                              {fieldState.error && (
                                <p className="text-sm text-red-500">
                                  {fieldState.error.message}
                                </p>
                              )}
                            </div>
                          )}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-base font-semibold">
                        <span className="text-red-500">*</span>사유 선택
                      </Label>
                      <Controller
                        name="reason"
                        control={form.control}
                        rules={{ required: "사유를 선택해주세요." }}
                        render={({ field, fieldState }) => (
                          <div className="space-y-2">
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="space-y-2"
                            >
                              {reasons.map((reason) => (
                                <div
                                  key={reason.value}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem
                                    value={reason.value}
                                    id={reason.value}
                                  />
                                  <Label
                                    htmlFor={reason.value}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {reason.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            {fieldState.error && (
                              <p className="text-sm text-red-500">
                                {fieldState.error.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">
                        상세 설명
                      </Label>
                      <Controller
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                          <Textarea
                            placeholder={`${claimTypeLabel} 사유를 자세히 입력해주세요.`}
                            className="min-h-[150px] resize-none"
                            maxLength={500}
                            {...field}
                          />
                        )}
                      />
                      <p className="text-xs text-zinc-500">
                        최대 500자까지 입력 가능합니다.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`)
                        }
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createClaimMutation.isPending}
                      >
                        {createClaimMutation.isPending
                          ? "신청 중..."
                          : `${claimTypeLabel} 신청하기`}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default ClaimFormPage;
