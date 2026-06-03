import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui-extended/button";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import type { ClaimType } from "@yeongseon/shared/types/view/claim-item";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { Form } from "@/shared/ui/form";
import { useForm, Controller } from "react-hook-form";
import { RadioGroupItem } from "@/shared/ui/radio-group";
import { RadioGroup } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldHeader,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { QuantitySelector } from "@/shared/composite/quantity-selector";
import { SummaryCard } from "@/shared/composite/summary-card";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "@/shared/lib/toast";
import { Empty } from "@/shared/composite/empty";
import { useOrderDetail } from "@/entities/order";
import { useCreateClaim } from "@/entities/claim";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { useEffect, useMemo, type ReactNode } from "react";

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
const CLAIM_FORM_ID = "claim-request-form";
const TECHNICAL_ERROR_PATTERNS = [
  /edge function returned a non-2xx status code/i,
  /failed to fetch/i,
  /network/i,
  /timeout/i,
  /rpc/i,
  /postgres/i,
  /sql/i,
  /syntax/i,
  /stack/i,
];

const isUserFriendlyClaimError = (message: string): boolean => {
  const normalized = message.trim();
  if (!normalized) {
    return false;
  }

  return !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
};

interface ClaimFormData {
  reason: string;
  description: string;
  quantity: number;
}

const getClaimNoticeItems = (type: ClaimType) => {
  switch (type) {
    case "cancel":
      return [
        "주문 취소는 배송 전에만 가능합니다.",
        "결제 취소는 영업일 기준 3-5일 소요됩니다.",
        "이미 배송이 시작된 경우 취소가 불가능합니다.",
      ];
    case "return":
      return [
        "반품은 상품 수령 후 7일 이내에 신청 가능합니다.",
        "상품이 사용되거나 훼손된 경우 반품이 불가능합니다.",
        "단순 변심 반품 배송비는 고객 부담입니다.",
        "상품 불량의 경우 배송비는 판매자 부담입니다.",
      ];
    case "exchange":
      return [
        "교환은 상품 수령 후 7일 이내에 신청 가능합니다.",
        "교환 배송비는 고객 부담입니다.",
        "교환 가능한 재고가 있는 경우에만 교환이 가능합니다.",
        "상품이 사용되거나 훼손된 경우 교환이 불가능합니다.",
      ];
    default:
      return [];
  }
};

function ClaimFormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldHeader>
        <FieldTitle as="h2">{title}</FieldTitle>
      </FieldHeader>
      <FieldContent>{children}</FieldContent>
    </Field>
  );
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
          <Card data-testid="claim-form-invalid-access">
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
  const quantity = form.watch("quantity");
  const selectedReasonLabel =
    reasons.find((reason) => reason.value === form.watch("reason"))?.label ??
    "선택 전";

  const handleSubmit = (data: ClaimFormData) => {
    createClaimMutation.mutate(
      {
        type,
        orderId: orderId,
        itemId: itemId,
        reason: data.reason,
        description: data.description || undefined,
        quantity: data.quantity,
      },
      {
        onSuccess: () => {
          toast.success(`${claimTypeLabel} 접수가 완료되었습니다.`);
          navigate(ROUTES.CLAIM_LIST);
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message.trim() : "";

          if (isUserFriendlyClaimError(message)) {
            toast.error(message);
            return;
          }

          toast.error(
            `${claimTypeLabel} 신청을 접수하지 못했어요. 다시 시도해주세요.`,
          );
        },
      },
    );
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <Form {...form}>
          <PageLayout
            breadcrumbs={[
              ...PAGE_BREADCRUMBS.CLAIM_LIST,
              { label: `${claimTypeLabel} 신청` },
            ]}
            contentClassName="space-y-6"
            sidebarClassName="space-y-4"
            sidebar={
              <SummaryCard>
                <SummaryCard.Header
                  title="신청 요약"
                  description="주문 정보와 접수할 요청 내용을 확인합니다."
                />
                <SummaryCard.Section>
                  <SummaryCard.Row label="신청 유형" value={claimTypeLabel} />
                  <SummaryCard.Row label="주문번호" value={order.orderNumber} />
                  <SummaryCard.Row
                    label="주문일시"
                    value={formatDate(order.date)}
                  />
                  <SummaryCard.Row label="신청 수량" value={`${quantity}개`} />
                  <SummaryCard.Row
                    label="선택 사유"
                    value={selectedReasonLabel}
                  />
                </SummaryCard.Section>
                <SummaryCard.Section>
                  <SummaryCard.NoticeList
                    label="유의사항"
                    items={getClaimNoticeItems(type)}
                  />
                </SummaryCard.Section>
                <SummaryCard.Section>
                  <SummaryCard.NoticeList
                    label="문의"
                    items={[
                      "추가 문의사항이 있으시면 고객센터로 연락해주세요.",
                    ]}
                  />
                </SummaryCard.Section>
              </SummaryCard>
            }
            actionBar={
              <div className="space-y-2">
                <Button
                  type="submit"
                  form={CLAIM_FORM_ID}
                  className="w-full"
                  size="xl"
                  disabled={createClaimMutation.isPending}
                  data-testid="claim-submit-button"
                >
                  {createClaimMutation.isPending
                    ? "신청 중..."
                    : `${claimTypeLabel} 신청하기`}
                </Button>
              </div>
            }
          >
            <form
              id={CLAIM_FORM_ID}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <ClaimFormSection
                title="주문 상품"
                className="border-t border-stone-200 pt-4"
              >
                <OrderItemCard
                  item={orderItem}
                  showQuantity={true}
                  showPrice={true}
                />
              </ClaimFormSection>

              {orderItem.quantity > 1 && (
                <ClaimFormSection title="신청 수량">
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
                      <>
                        <div className="flex items-center justify-between gap-4 bg-zinc-50 p-4 rounded-sm">
                          <FieldDescription className="text-zinc-600">
                            전체 수량: {orderItem.quantity}개
                          </FieldDescription>
                          <QuantitySelector
                            value={field.value}
                            onChange={field.onChange}
                            min={1}
                            max={orderItem.quantity}
                          />
                        </div>
                        <FieldError errors={[fieldState.error]} />
                      </>
                    )}
                  />
                </ClaimFormSection>
              )}

              <ClaimFormSection title={`${claimTypeLabel} 사유`}>
                <Controller
                  name="reason"
                  control={form.control}
                  rules={{ required: "사유를 선택해주세요." }}
                  render={({ field, fieldState }) => (
                    <>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        className="space-y-2"
                      >
                        {reasons.map((reason) => (
                          <Field key={reason.value} orientation="horizontal">
                            <RadioGroupItem
                              value={reason.value}
                              id={reason.value}
                            />
                            <FieldLabel
                              htmlFor={reason.value}
                              className="font-normal cursor-pointer"
                            >
                              <FieldTitle className="font-normal">
                                {reason.label}
                              </FieldTitle>
                            </FieldLabel>
                          </Field>
                        ))}
                      </RadioGroup>
                      <FieldError errors={[fieldState.error]} />
                    </>
                  )}
                />
              </ClaimFormSection>

              <ClaimFormSection title="상세 설명">
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <>
                      <Textarea
                        id="description"
                        placeholder={`${claimTypeLabel} 사유를 자세히 입력해주세요.`}
                        maxLength={500}
                        minHeight="large"
                        className="resize-none"
                        {...field}
                      />
                      <FieldDescription>
                        최대 500자까지 입력 가능합니다.
                      </FieldDescription>
                    </>
                  )}
                />
              </ClaimFormSection>
            </form>
          </PageLayout>
        </Form>
      </MainContent>
    </MainLayout>
  );
};

export default ClaimFormPage;
