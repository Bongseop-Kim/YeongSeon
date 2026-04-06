import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutBodySections } from "@/widgets/checkout";

describe("CheckoutBodySections", () => {
  it("배송지, 전화번호, 요청사항 라벨을 보여주고 배송지 버튼을 위임한다", () => {
    const onOpenShippingPopup = vi.fn();

    render(
      <CheckoutBodySections
        appliedCoupon={undefined}
        discountAmount={0}
        onChangeCoupon={vi.fn()}
        selectedAddress={{
          id: "address-1",
          recipientName: "홍길동",
          recipientPhone: "01012345678",
          address: "서울시 종로구 세종대로 1",
          detailAddress: "101호",
          postalCode: "12345",
          deliveryRequest: "DELIVERY_REQUEST_4",
          isDefault: true,
        }}
        onOpenShippingPopup={onOpenShippingPopup}
      />,
    );

    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(
      screen.getByText((content) => {
        return (
          content.includes("(12345)") &&
          content.includes("서울시 종로구 세종대로 1") &&
          content.includes("101호")
        );
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("배송 전에 연락 주세요.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "배송지 변경" }));
    expect(onOpenShippingPopup).toHaveBeenCalledTimes(1);
  });

  it("주소가 없으면 대체 문구를 보여준다", () => {
    render(
      <CheckoutBodySections
        appliedCoupon={undefined}
        discountAmount={0}
        onChangeCoupon={vi.fn()}
        selectedAddress={null}
        onOpenShippingPopup={vi.fn()}
      />,
    );

    expect(screen.getByText("배송지를 추가해주세요.")).toBeInTheDocument();
  });
});
