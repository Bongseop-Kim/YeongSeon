import { PopupLayout } from "@/components/layout/popup-layout";
import { Button } from "@/components/ui/button";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/composite/select-field";
import { DELIVERY_REQUEST_OPTIONS } from "@/features/shipping/constants/DELIVERY_REQUEST_OPTIONS";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/composite/check-box-field";
import { PostcodeSearch } from "@/features/shipping/components/PostcodeSearch";
import { useState, useEffect } from "react";
import type { DaumPostcodeData } from "@/features/shipping/hooks/useDaumPostcode";
import {
  useShippingAddress,
  useCreateShippingAddress,
  useUpdateShippingAddress,
  useShippingAddresses,
} from "@/features/shipping/api/shipping-query";
import { extractPhoneNumber, formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { toast } from "@/lib/toast";
import { SHIPPING_MESSAGE_TYPE } from "@/features/order/constants/SHIPPING_EVENTS";
import { usePopupChild } from "@/hooks/usePopup";

const ShippingFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addressId = searchParams.get("id");
  const isEditMode = !!addressId;
  const [showPostcodeSearch, setShowPostcodeSearch] = useState(false);
  const { postMessageAndClose } = usePopupChild();
  const { data: existingAddress, isLoading } = useShippingAddress(
    addressId || ""
  );
  const { data: addresses } = useShippingAddresses();
  const createMutation = useCreateShippingAddress();
  const updateMutation = useUpdateShippingAddress();

  // 처음 등록인지 확인 (배송지가 0개인 경우)
  const isFirstAddress = !isEditMode && (!addresses || addresses.length === 0);

  const form = useForm<ShippingAddress>({
    defaultValues: {
      recipientName: "",
      recipientPhone: "",
      address: "",
      detailAddress: "",
      postalCode: "",
      deliveryRequest: undefined,
      deliveryMemo: undefined,
      isDefault: isFirstAddress, // 처음 등록 시 자동으로 기본 배송지 설정
    },
  });

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && existingAddress) {
      form.reset({
        recipientName: existingAddress.recipientName,
        recipientPhone: existingAddress.recipientPhone,
        address: existingAddress.address,
        detailAddress: existingAddress.detailAddress,
        postalCode: existingAddress.postalCode,
        deliveryRequest: existingAddress.deliveryRequest,
        deliveryMemo: existingAddress.deliveryMemo,
        isDefault: existingAddress.isDefault,
      });
    }
  }, [isEditMode, existingAddress, form]);

  // 처음 등록 시 기본 배송지 자동 설정
  useEffect(() => {
    if (isFirstAddress) {
      form.setValue("isDefault", true);
    }
  }, [isFirstAddress, form]);

  // 배송지가 1개만 있을 때 기본 배송지 체크 해제 불가
  const canUncheckDefault = !isEditMode || (addresses && addresses.length > 1);

  const { handleSubmit } = form;

  const onSubmit = (data: ShippingAddress) => {
    // 필수값 검증
    if (!data.recipientName.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (!data.recipientPhone.trim()) {
      toast.error("휴대폰번호를 입력해주세요.");
      return;
    }
    if (!data.address.trim() || !data.postalCode.trim()) {
      toast.error("주소를 입력해주세요.");
      return;
    }
    // 상세주소는 선택사항이므로 빈 문자열도 허용

    // 전화번호는 숫자만 저장
    const phoneNumber = extractPhoneNumber(data.recipientPhone);

    if (isEditMode && addressId) {
      updateMutation.mutate(
        {
          id: addressId,
          data: {
            recipientName: data.recipientName,
            recipientPhone: phoneNumber,
            address: data.address,
            detailAddress: data.detailAddress || "",
            postalCode: data.postalCode,
            deliveryRequest: data.deliveryRequest,
            deliveryMemo: data.deliveryMemo,
            isDefault: data.isDefault,
          },
        },
        {
          onSuccess: () => {
            navigate(-1);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          recipientName: data.recipientName,
          recipientPhone: phoneNumber,
          address: data.address,
          detailAddress: data.detailAddress,
          postalCode: data.postalCode,
          deliveryRequest: data.deliveryRequest,
          deliveryMemo: data.deliveryMemo,
          isDefault: isFirstAddress ? true : data.isDefault, // 처음 등록 시 항상 기본 배송지
        },
        {
          onSuccess: (newAddress) => {
            postMessageAndClose({
              type: SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED,
              addressId: newAddress.id,
            });
          },
        }
      );
    }
  };

  if (isEditMode && isLoading) {
    return (
      <PopupLayout title="배송지 수정" onClose={() => navigate(-1)}>
        <div className="text-center py-8 text-zinc-500">로딩 중...</div>
      </PopupLayout>
    );
  }

  return (
    <PopupLayout
      title={isEditMode ? "배송지 수정" : "배송지 추가"}
      onClose={() => navigate(-1)}
      footer={
        <Button
          type="submit"
          form="shipping-form"
          className="w-full"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          저장하기
        </Button>
      }
    >
      <Form {...form}>
        <form
          id="shipping-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>
              이름 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="recipientName"
              control={form.control}
              rules={{ required: "이름을 입력해주세요." }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    placeholder="받는 분의 이름을 입력해주세요."
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>
              휴대폰번호 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="recipientPhone"
              control={form.control}
              rules={{
                required: "휴대폰번호를 입력해주세요.",
                validate: (value) => {
                  const numbers = extractPhoneNumber(value);
                  if (numbers.length < 10 || numbers.length > 11) {
                    return "올바른 휴대폰번호를 입력해주세요.";
                  }
                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="휴대폰번호를 입력해주세요."
                    value={formatPhoneNumber(field.value ?? "")}
                    onChange={(e) => {
                      const numbers = extractPhoneNumber(e.target.value);
                      // 최대 11자리까지만 입력 가능
                      if (numbers.length <= 11) {
                        field.onChange(numbers);
                      }
                    }}
                    className="w-full"
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>
              주소 <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Controller
                name="postalCode"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="text"
                    placeholder="우편번호를 입력해주세요."
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                    disabled
                  />
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPostcodeSearch(true)}
              >
                우편번호 검색
              </Button>
            </div>
            <Controller
              name="address"
              control={form.control}
              render={({ field }) => (
                <Input
                  type="text"
                  placeholder="주소를 입력해주세요."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full"
                  disabled
                />
              )}
            />
            <PostcodeSearch
              isOpen={showPostcodeSearch}
              onComplete={(data: DaumPostcodeData) => {
                form.setValue("postalCode", data.zonecode);
                form.setValue("address", data.roadAddress || data.jibunAddress);
                setShowPostcodeSearch(false);
              }}
              onClose={() => setShowPostcodeSearch(false)}
            />
            <Controller
              name="detailAddress"
              control={form.control}
              render={({ field }) => (
                <Input
                  type="text"
                  placeholder="상세주소를 입력해주세요. (선택사항)"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <SelectField<ShippingAddress>
              name="deliveryRequest"
              control={form.control}
              label="배송 요청사항"
              options={DELIVERY_REQUEST_OPTIONS}
            />
            {form.watch("deliveryRequest") === "DELIVERY_REQUEST_5" && (
              <Controller
                name="deliveryMemo"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    placeholder="최대 50자까지 입력 가능합니다."
                    className="min-h-[100px] resize-none"
                    maxLength={50}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              />
            )}
          </div>

          <CheckboxField<ShippingAddress>
            name="isDefault"
            control={form.control}
            label="기본 배송지"
            disabled={isFirstAddress || !canUncheckDefault}
          />
        </form>
      </Form>
    </PopupLayout>
  );
};

export default ShippingFormPage;
