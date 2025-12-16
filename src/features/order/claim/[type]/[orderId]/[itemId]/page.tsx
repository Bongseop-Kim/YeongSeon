import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import type { Order, OrderItem } from "@/features/order/types/order-item";
import type { ClaimType } from "@/features/order/types/claim-item";
import { formatDate } from "@/features/order/utils/fs";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";
import { Form } from "@/components/ui/form";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuantitySelector } from "@/components/composite/quantity-selector";
import { ROUTES } from "@/constants/ROUTES";

// 더미 주문 데이터 (실제로는 API에서 가져올 것)
const dummyOrders: Order[] = [
  {
    id: "order-1",
    orderNumber: "ORD-20250115-001",
    date: "2025-01-15",
    status: "완료",
    totalPrice: 135000,
    items: [
      {
        id: "item-1",
        type: "product",
        product: PRODUCTS_DATA[0],
        quantity: 2,
      },
      {
        id: "item-2",
        type: "product",
        product: PRODUCTS_DATA[1],
        selectedOption: { id: "45", name: "45cm", additionalPrice: 0 },
        quantity: 1,
      },
      {
        id: "item-3",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-1",
            measurementType: "length",
            tieLength: 145,
          },
          cost: 15000,
        },
      },
    ],
  },
  {
    id: "order-2",
    orderNumber: "ORD-20250114-002",
    date: "2025-01-14",
    status: "배송중",
    totalPrice: 96000,
    items: [
      {
        id: "item-4",
        type: "product",
        product: PRODUCTS_DATA[2],
        quantity: 2,
      },
    ],
  },
  {
    id: "order-3",
    orderNumber: "ORD-20250113-003",
    date: "2025-01-13",
    status: "진행중",
    totalPrice: 78000,
    items: [
      {
        id: "item-5",
        type: "product",
        product: PRODUCTS_DATA[3],
        quantity: 2,
      },
    ],
  },
  {
    id: "order-4",
    orderNumber: "ORD-20250112-004",
    date: "2025-01-12",
    status: "완료",
    totalPrice: 30000,
    items: [
      {
        id: "item-6",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-2",
            measurementType: "height",
            wearerHeight: 175,
          },
          cost: 15000,
        },
      },
      {
        id: "item-7",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-3",
            measurementType: "length",
            tieLength: 150,
          },
          cost: 15000,
        },
      },
    ],
  },
];

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

// 클레임 타입 한글명
const getClaimTypeLabel = (type: ClaimType) => {
  switch (type) {
    case "cancel":
      return "취소";
    case "return":
      return "반품";
    case "exchange":
      return "교환";
    default:
      return "";
  }
};

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
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItem, setOrderItem] = useState<OrderItem | null>(null);

  const form = useForm<ClaimFormData>({
    defaultValues: {
      reason: "",
      description: "",
      quantity: 1,
    },
  });

  useEffect(() => {
    if (!type || !orderId || !itemId) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    // 유효한 클레임 타입인지 확인
    if (!["cancel", "return", "exchange"].includes(type)) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    // 실제로는 API에서 주문 정보를 가져올 것
    const foundOrder = dummyOrders.find((o) => o.id === orderId);
    if (!foundOrder) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    const foundItem = foundOrder.items.find((item) => item.id === itemId);
    if (!foundItem) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    setOrder(foundOrder);
    setOrderItem(foundItem);
    // 수량 기본값 설정
    form.setValue("quantity", foundItem.quantity);
  }, [type, orderId, itemId, navigate, form]);

  if (!order || !orderItem) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 정보를 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  const claimTypeLabel = getClaimTypeLabel(type!);
  const reasons = getClaimReasons(type!);

  const handleSubmit = (data: ClaimFormData) => {
    console.log("클레임 신청:", {
      type,
      orderId,
      itemId,
      reason: data.reason,
      description: data.description,
      quantity: data.quantity,
    });
    // 실제로는 API 호출
    alert(`${claimTypeLabel} 신청이 완료되었습니다.`);
    navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`);
  };

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
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
                      <Button type="submit" className="flex-1">
                        {claimTypeLabel} 신청하기
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          }
          rightPanel={
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
        />
      </MainContent>
    </MainLayout>
  );
};

export default ClaimFormPage;
