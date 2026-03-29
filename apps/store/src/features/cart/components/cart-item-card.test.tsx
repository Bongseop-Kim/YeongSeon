import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppliedCoupon, createCartItem } from "@/test/fixtures";
import { CartItemCard } from "@/features/cart/components/cart-item-card";

vi.mock("@/shared/ui-extended/close", () => ({
  default: ({ onRemove }: { onRemove: () => void }) => (
    <button type="button" onClick={onRemove} aria-label="닫기">
      X
    </button>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CartItemCard", () => {
  it("상품명, 코드, 수량을 렌더링한다", () => {
    render(
      <CartItemCard
        item={createCartItem({
          quantity: 2,
          selectedOption: {
            id: "opt-2",
            name: "네이비",
            additionalPrice: 0,
          },
        })}
        onRemove={vi.fn()}
        onChangeOption={vi.fn()}
        onChangeCoupon={vi.fn()}
      />,
    );

    expect(screen.getByText("테스트 넥타이")).toBeInTheDocument();
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.getByText("네이비 / 2개")).toBeInTheDocument();
  });

  it("쿠폰이 없으면 원가만 표시한다", () => {
    render(
      <CartItemCard
        item={createCartItem({ quantity: 2 })}
        onRemove={vi.fn()}
        onChangeOption={vi.fn()}
        onChangeCoupon={vi.fn()}
      />,
    );

    const price = screen.getByText("20,000원");
    expect(price).toBeInTheDocument();
    expect(screen.queryByText(/적용$/)).not.toBeInTheDocument();
  });

  it("쿠폰이 있으면 원가와 할인가, 쿠폰명을 표시한다", () => {
    render(
      <CartItemCard
        item={createCartItem({
          quantity: 2,
          appliedCoupon: createAppliedCoupon(),
        })}
        onRemove={vi.fn()}
        onChangeOption={vi.fn()}
        onChangeCoupon={vi.fn()}
      />,
    );

    expect(screen.getByText("20,000원")).toHaveClass("line-through");
    expect(screen.getByText("19,000원")).toBeInTheDocument();
    expect(screen.getByText("500원 할인 적용")).toBeInTheDocument();
  });

  it("옵션 변경 버튼 클릭 시 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const onChangeOption = vi.fn();

    render(
      <CartItemCard
        item={createCartItem()}
        onRemove={vi.fn()}
        onChangeOption={onChangeOption}
        onChangeCoupon={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "옵션 변경" }));

    expect(onChangeOption).toHaveBeenCalledOnce();
  });

  it("쿠폰 사용 버튼 클릭 시 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const onChangeCoupon = vi.fn();

    render(
      <CartItemCard
        item={createCartItem()}
        onRemove={vi.fn()}
        onChangeOption={vi.fn()}
        onChangeCoupon={onChangeCoupon}
      />,
    );

    await user.click(screen.getByRole("button", { name: "쿠폰 사용" }));

    expect(onChangeCoupon).toHaveBeenCalledOnce();
  });

  it("닫기 버튼 클릭 시 삭제 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <CartItemCard
        item={createCartItem()}
        onRemove={onRemove}
        onChangeOption={vi.fn()}
        onChangeCoupon={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
