import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createReformCartItem } from "@/test/fixtures";
import { ReformItemInfo } from "@/shared/ui/reform-item-info";

describe("ReformItemInfo", () => {
  it("서비스와 치수 문구에 디자인 토큰 색상 클래스를 사용한다", () => {
    render(<ReformItemInfo item={createReformCartItem()} />);

    expect(screen.getByText(/서비스:/)).toHaveClass("text-foreground-muted");
    expect(screen.getByText("길이: 145cm")).toHaveClass(
      "text-foreground-muted",
    );
  });

  it("치수 값이 없으면 undefined 문구를 렌더링하지 않는다", () => {
    render(
      <ReformItemInfo
        item={createReformCartItem({
          reformData: {
            tie: {
              id: "tie-1",
              measurementType: "length",
              tieLength: undefined,
            },
            cost: 15000,
          },
        })}
      />,
    );

    expect(screen.queryByText(/길이:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefinedcm/)).not.toBeInTheDocument();
  });
});
