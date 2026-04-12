import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import type { OrderOptions } from "@/entities/custom-order";
import { CustomOrderCostFooter } from "./custom-order-cost-footer";

const baseOptions = {
  quantity: 10,
  tieType: "AUTO",
  dimple: false,
  spoderato: false,
  fold7: false,
  fabricType: "POLY",
  designType: "PRINTING",
  fabricProvided: false,
  reorder: false,
  sizeType: "ADULT",
} as OrderOptions;

const wrap = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("CustomOrderCostFooter", () => {
  it("비로그인 상태에서 로그인 안내 텍스트를 표시한다", () => {
    wrap(
      <CustomOrderCostFooter
        options={baseOptions}
        totalCost={100000}
        sewingCost={50000}
        fabricCost={50000}
        pricingConfig={undefined}
        isLoggedIn={false}
      />,
    );

    expect(
      screen.getByText("로그인하면 예상 비용을 확인할 수 있어요"),
    ).toBeInTheDocument();
    expect(screen.queryByText("예상 총비용")).not.toBeInTheDocument();
  });

  it("로그인 상태에서 예상 총비용과 단가를 표시한다", () => {
    wrap(
      <CustomOrderCostFooter
        options={baseOptions}
        totalCost={100000}
        sewingCost={50000}
        fabricCost={50000}
        pricingConfig={undefined}
        isLoggedIn={true}
      />,
    );

    expect(screen.getByText("예상 총비용")).toBeInTheDocument();
    expect(screen.getByText("100,000원")).toBeInTheDocument();
    expect(screen.getByText("10,000원/개")).toBeInTheDocument();
  });
});
