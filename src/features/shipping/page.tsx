import { PopupLayout } from "@/components/layout/popup-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/ROUTES";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useShippingAddresses,
  useDeleteShippingAddress,
} from "./api/shipping-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useModalStore } from "@/store/modal";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { formatPhoneNumber } from "./utils/phone-format";
import { getDeliveryRequestLabel } from "./constants/DELIVERY_REQUEST_OPTIONS";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SHIPPING_MESSAGE_TYPE } from "@/features/order/constants/SHIPPING_EVENTS";
import { usePopupChild } from "@/hooks/usePopup";

const ShippingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "select"; // "select" 또는 "manage"
  const showChangeButton = mode === "select"; // 주문 페이지에서 열린 경우만 변경 버튼 표시
  const { postMessageAndClose } = usePopupChild();
  const { data: addresses, isLoading } = useShippingAddresses();
  const { openModal } = useModalStore();
  const deleteMutation = useDeleteShippingAddress();
  const isPopupContext =
    typeof window !== "undefined" &&
    !!window.opener &&
    window.opener !== window;
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // 검색 필터링
  const filteredAddresses = addresses?.filter((address) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      address.recipientName.toLowerCase().includes(query) ||
      address.address.toLowerCase().includes(query) ||
      address.recipientPhone.includes(query)
    );
  });

  const handleDelete = (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error("기본 배송지는 삭제할 수 없습니다.");
      return;
    }

    openModal({
      title: "배송지 삭제",
      children: <div>정말 이 배송지를 삭제하시겠습니까?</div>,
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleConfirm = () => {
    if (isPopupContext) {
      postMessageAndClose({
        type: SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED,
        addressId: selectedAddressId,
      });
      return;
    }

    navigate(-1);
  };

  return (
    <PopupLayout
      onClose={() => {
        if (isPopupContext) {
          window.close();
          return;
        }

        navigate(-1);
      }}
      title="배송지 정보"
      headerContent={
        <Input
          placeholder="배송지 이름, 주소, 연락처로 검색하세요."
          className="bg-white mb-4"
          icon={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      }
      footer={
        showChangeButton ? (
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={!selectedAddressId}
          >
            변경하기
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate(ROUTES.SHIPPING_FORM)}
        >
          배송지 추가하기
        </Button>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-500">로딩 중...</div>
        ) : !filteredAddresses || filteredAddresses.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            {searchQuery
              ? "검색 결과가 없습니다."
              : "등록된 배송지가 없습니다."}
          </div>
        ) : (
          <RadioGroup
            value={selectedAddressId || ""}
            onValueChange={setSelectedAddressId}
            className="space-y-3"
          >
            {filteredAddresses.map((address) => (
              <Card
                key={address.id}
                className={`cursor-pointer ${
                  showChangeButton ? "" : "hover:bg-zinc-50"
                }`}
                onClick={() => {
                  if (showChangeButton) {
                    setSelectedAddressId(address.id);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {showChangeButton && (
                      <RadioGroupItem
                        value={address.id}
                        id={address.id}
                        className="mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAddressId(address.id);
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {address.recipientName}
                          </h3>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              기본
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `${ROUTES.SHIPPING_FORM}?id=${address.id}`
                              );
                            }}
                          >
                            수정
                          </Button>
                          {!address.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-500 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(address.id, address.isDefault);
                              }}
                            >
                              삭제
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-zinc-600">
                        <p>{formatPhoneNumber(address.recipientPhone)}</p>
                        <p>
                          ({address.postalCode}) {address.address}{" "}
                          {address.detailAddress}
                        </p>
                        {address.deliveryRequest && (
                          <p className="text-zinc-500">
                            배송 요청:{" "}
                            {getDeliveryRequestLabel(
                              address.deliveryRequest,
                              address.deliveryMemo
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </RadioGroup>
        )}
      </div>
    </PopupLayout>
  );
};

export default ShippingPage;
