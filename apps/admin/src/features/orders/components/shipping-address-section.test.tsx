import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShippingAddressSection } from "./shipping-address-section";

describe("ShippingAddressSection", () => {
  it("배송요청 코드를 한글 레이블로 표시한다", () => {
    render(
      <ShippingAddressSection
        address={{
          recipientName: "홍길동",
          recipientPhone: "01012345678",
          postalCode: "12345",
          address: "서울시 종로구 세종대로 1",
          addressDetail: "101호",
          deliveryMemo: null,
          deliveryRequest: "DELIVERY_REQUEST_2",
        }}
      />,
    );

    expect(screen.getByText("경비실에 맡겨 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("DELIVERY_REQUEST_2")).not.toBeInTheDocument();
  });
});
