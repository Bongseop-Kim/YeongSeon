import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShippingAddressCard } from "./ShippingAddressCard";

const address = {
  recipientName: "김봉섭",
  recipientPhone: "01049457422",
  address: "대전 동구 우암로246번길 9-16",
  detailAddress: "주택",
  postalCode: "34595",
  deliveryRequest: "DELIVERY_REQUEST_2",
  deliveryMemo: undefined,
};

describe("ShippingAddressCard", () => {
  it("수령인 이름을 표시한다", () => {
    render(<ShippingAddressCard address={address} />);
    expect(screen.getByText("김봉섭")).toBeInTheDocument();
  });

  it("주소를 한 줄로 표시한다", () => {
    render(<ShippingAddressCard address={address} />);
    expect(
      screen.getByText("대전 동구 우암로246번길 9-16 주택 (34595)"),
    ).toBeInTheDocument();
  });

  it("연락처를 포맷해서 표시한다", () => {
    render(<ShippingAddressCard address={address} />);
    expect(screen.getByText("010-4945-7422")).toBeInTheDocument();
  });

  it("배송메시지를 텍스트로 표시한다", () => {
    render(<ShippingAddressCard address={address} />);
    expect(screen.getByText("경비실에 맡겨 주세요.")).toBeInTheDocument();
  });

  it("배송메시지가 없으면 표시하지 않는다", () => {
    render(
      <ShippingAddressCard
        address={{ ...address, deliveryRequest: undefined }}
      />,
    );
    expect(screen.queryByText(/주세요/)).not.toBeInTheDocument();
  });

  it("editable=false이면 배송지 변경 버튼이 없다", () => {
    render(<ShippingAddressCard address={address} />);
    expect(
      screen.queryByRole("button", { name: "배송지 변경" }),
    ).not.toBeInTheDocument();
  });

  it("editable=true이면 배송지 변경 버튼이 보인다", () => {
    render(
      <ShippingAddressCard
        address={address}
        editable
        onChangeClick={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "배송지 변경" }),
    ).toBeInTheDocument();
  });

  it("배송지 변경 버튼 클릭 시 onChangeClick이 호출된다", async () => {
    const onChangeClick = vi.fn();
    render(
      <ShippingAddressCard
        address={address}
        editable
        onChangeClick={onChangeClick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "배송지 변경" }));
    expect(onChangeClick).toHaveBeenCalledOnce();
  });

  it("address=null이고 editable=true이면 빈 상태 메시지와 변경 버튼을 표시한다", () => {
    render(
      <ShippingAddressCard address={null} editable onChangeClick={vi.fn()} />,
    );
    expect(screen.getByText("배송지를 추가해주세요.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "배송지 변경" }),
    ).toBeInTheDocument();
  });

  it("detailAddress가 없으면 주소와 우편번호만 표시한다", () => {
    render(
      <ShippingAddressCard
        address={{ ...address, detailAddress: undefined }}
      />,
    );
    expect(
      screen.getByText("대전 동구 우암로246번길 9-16 (34595)"),
    ).toBeInTheDocument();
  });
});
