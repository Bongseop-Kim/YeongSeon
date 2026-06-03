import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProduct, createProductOption } from "@/test/fixtures";
import { ROUTES } from "@/shared/constants/ROUTES";
import { processOrderAndNavigate } from "@/features/shop/detail/utils/process-order";

const { warning } = vi.hoisted(() => ({
  warning: vi.fn(),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    warning,
  },
}));

vi.mock("@/shared/lib/utils", () => ({
  generateItemId: (...parts: (string | number | undefined)[]) =>
    parts.filter((part) => part != null).join("-"),
}));

describe("processOrderAndNavigate", () => {
  beforeEach(() => {
    warning.mockReset();
  });

  it("옵션이 없는 상품은 기본 수량으로 주문 아이템을 만들고 주문서로 이동한다", () => {
    const product = createProduct({ options: [] });
    const setOrderItems = vi.fn();
    const navigate = vi.fn();

    processOrderAndNavigate(product, [], 3, setOrderItems, navigate);

    expect(setOrderItems).toHaveBeenCalledWith([
      {
        id: `${product.id}-base`,
        type: "product",
        product,
        selectedOption: undefined,
        quantity: 3,
      },
    ]);
    expect(navigate).toHaveBeenCalledWith(ROUTES.ORDER_FORM);
    expect(warning).not.toHaveBeenCalled();
  });

  it("옵션이 있는 상품은 선택 옵션별 주문 아이템을 만들고 주문서로 이동한다", () => {
    const firstOption = createProductOption({ id: "opt-1", name: "기본" });
    const secondOption = createProductOption({
      id: "opt-2",
      name: "프리미엄",
      additionalPrice: 3000,
    });
    const product = createProduct({ options: [firstOption, secondOption] });
    const setOrderItems = vi.fn();
    const navigate = vi.fn();

    processOrderAndNavigate(
      product,
      [
        { option: firstOption, quantity: 1 },
        { option: secondOption, quantity: 2 },
      ],
      9,
      setOrderItems,
      navigate,
    );

    expect(setOrderItems).toHaveBeenCalledWith([
      {
        id: `${product.id}-${firstOption.id}`,
        type: "product",
        product,
        selectedOption: firstOption,
        quantity: 1,
      },
      {
        id: `${product.id}-${secondOption.id}`,
        type: "product",
        product,
        selectedOption: secondOption,
        quantity: 2,
      },
    ]);
    expect(navigate).toHaveBeenCalledWith(ROUTES.ORDER_FORM);
  });

  it("옵션이 필요한 상품에서 선택 옵션이 없으면 경고만 표시한다", () => {
    const product = createProduct();
    const setOrderItems = vi.fn();
    const navigate = vi.fn();

    processOrderAndNavigate(product, [], 1, setOrderItems, navigate);

    expect(warning).toHaveBeenCalledWith("옵션을 선택해주세요.");
    expect(setOrderItems).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
