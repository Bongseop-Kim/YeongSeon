import { Search } from "lucide-react";
import { Button } from "@/shared/ui-extended/button";
import { Input } from "@/shared/ui-extended/input";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { formatPhoneNumber } from "@/shared/lib/phone-format";
import type { PickupRequestInfo } from "@/features/order/repair-shipping/pickup-request-model";

interface PickupShippingAddress {
  name: string;
  phone: string;
  address: string;
}

interface PickupRequestFieldsProps {
  value: PickupRequestInfo;
  onChange: (value: PickupRequestInfo) => void;
  /** 배송지가 선택돼 있으면 "배송지 정보와 동일해요" 요약으로 입력을 생략한다. */
  shippingAddress?: PickupShippingAddress | null;
  /** 주소 검색 다이얼로그는 페이지가 소유한다 (features 간 직접 의존 금지). */
  onSearchAddress?: () => void;
}

/** 방문 수거 신청: 수거지 이름/연락처/주소 입력 */
export function PickupRequestFields({
  value,
  onChange,
  shippingAddress,
  onSearchAddress,
}: PickupRequestFieldsProps) {
  const update = (patch: Partial<PickupRequestInfo>) =>
    onChange({ ...value, ...patch });

  const canUseShippingAddress = !!shippingAddress;
  const useShippingAddress = value.sameAsShipping && canUseShippingAddress;

  return (
    <FieldGroup className="gap-5">
      {canUseShippingAddress ? (
        <Field orientation="horizontal" className="items-center gap-2">
          <Checkbox
            id="pickup-same-as-shipping"
            checked={value.sameAsShipping}
            onCheckedChange={(checked) =>
              update({ sameAsShipping: checked === true })
            }
            className="mt-0"
          />
          <FieldContent className="gap-1">
            <FieldLabel htmlFor="pickup-same-as-shipping">
              <FieldTitle>배송지 정보와 동일해요</FieldTitle>
            </FieldLabel>
          </FieldContent>
        </Field>
      ) : null}

      {useShippingAddress && shippingAddress ? (
        <Field>
          <FieldTitle>{shippingAddress.name}</FieldTitle>
          <FieldContent className="text-sm text-zinc-600">
            <FieldDescription className="text-zinc-600">
              {shippingAddress.address}
            </FieldDescription>
            <FieldDescription className="text-zinc-600">
              {formatPhoneNumber(shippingAddress.phone)}
            </FieldDescription>
          </FieldContent>
        </Field>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="pickup-name">
              <FieldTitle>이름</FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input
                id="pickup-name"
                type="text"
                placeholder="수거지에서 만날 분의 이름"
                value={value.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="pickup-phone">
              <FieldTitle>연락처</FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Input
                id="pickup-phone"
                type="tel"
                placeholder="010-0000-0000"
                value={value.phone}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="pickup-address">
              <FieldTitle>수거지 주소</FieldTitle>
            </FieldLabel>
            <FieldContent className="gap-2">
              <Field orientation="horizontal" className="gap-2">
                <Input
                  id="pickup-address"
                  type="text"
                  placeholder="주소 검색을 이용해주세요"
                  value={
                    value.address
                      ? `${value.address}${value.postalCode ? ` (${value.postalCode})` : ""}`
                      : ""
                  }
                  readOnly
                  className="flex-1"
                />
                {onSearchAddress ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSearchAddress}
                    className="shrink-0"
                  >
                    <Search className="size-3.5" />
                    주소 검색
                  </Button>
                ) : null}
              </Field>
              <Input
                type="text"
                aria-label="상세 주소"
                placeholder="상세 주소 (동/호수 등)"
                value={value.detailAddress}
                onChange={(e) => update({ detailAddress: e.target.value })}
              />
            </FieldContent>
          </Field>
        </>
      )}
    </FieldGroup>
  );
}
