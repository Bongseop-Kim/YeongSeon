import { PageTitle } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import CloseButton from "@/components/ui/close";
import { Controller, useForm } from "react-hook-form";

import { useNavigate } from "react-router-dom";
import type { ShippingAddress } from "../types/shipping-address";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/composite/SelectField";
import { DELIVERY_REQUEST_OPTIONS } from "../constants/DELIVERY_REQUEST_OPTIONS";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/composite/CheckboxField";
import { PostcodeSearch } from "@/features/shipping/components/PostcodeSearch";
import { useState } from "react";
import type { DaumPostcodeData } from "@/features/shipping/hooks/useDaumPostcode";

const ShippingFormPage = () => {
  const navigate = useNavigate();
  const [showPostcodeSearch, setShowPostcodeSearch] = useState(false);

  const form = useForm<ShippingAddress>({});

  return (
    <div className="min-h-screen w-full relative">
      <div className="bg-stone-100 px-2 flex items-center justify-between">
        <PageTitle>배송지 추가</PageTitle>

        <CloseButton onRemove={() => navigate("/shipping")} />
      </div>

      <div className="px-2 py-4 pb-20">
        <Form {...form}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Controller
                name="recipientName"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="text"
                    placeholder="받는 분의 이름을 입력해주세요."
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>휴대폰번호</Label>
              <Controller
                name="recipientPhone"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="tel"
                    placeholder="휴대폰번호를 입력해주세요."
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>주소</Label>
              <div className="flex items-center gap-2">
                <Controller
                  name="postalCode"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      placeholder="우편번호를 입력해주세요."
                      value={field.value}
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
                    value={field.value}
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
                  form.setValue(
                    "address",
                    data.roadAddress || data.jibunAddress
                  );
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
                    placeholder="상세주소를 입력해주세요."
                    value={field.value}
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
                      {...field}
                    />
                  )}
                />
              )}
            </div>

            <CheckboxField<ShippingAddress>
              name="isDefault"
              control={form.control}
              label="기본 배송지"
            />
          </div>
        </Form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-2 py-4 bg-white border-t">
        <Button className="w-full">저장하기</Button>
      </div>
    </div>
  );
};

export default ShippingFormPage;
