import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SummaryCard } from "@/shared/composite/summary-card";

describe("SummaryCard", () => {
  it("renders header title and description", () => {
    render(
      <SummaryCard>
        <SummaryCard.Header
          title="주문 요약"
          description="현재 선택한 내용을 기준으로 확인합니다."
        />
      </SummaryCard>,
    );

    expect(
      screen.getByRole("heading", { name: "주문 요약" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("현재 선택한 내용을 기준으로 확인합니다."),
    ).toBeInTheDocument();
  });

  it("renders row label and value", () => {
    render(
      <SummaryCard>
        <SummaryCard.Section title="Core rows">
          <SummaryCard.Row label="선택 항목" value="4개" />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("선택 항목")).toBeInTheDocument();
    expect(screen.getByText("4개")).toBeInTheDocument();
  });

  it("aligns row label and value vertically centered", () => {
    render(
      <SummaryCard>
        <SummaryCard.Section>
          <SummaryCard.Row label="선택 항목" value="4개" />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("선택 항목").closest("div")).toHaveClass(
      "items-center",
    );
  });

  it("does not render top divider or top padding on the first section after the header", () => {
    render(
      <SummaryCard>
        <SummaryCard.Header title="주문 요약" />
        <SummaryCard.Section title="Core rows">
          <SummaryCard.Row label="선택 항목" value="4개" />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("Core rows").closest("section")).not.toHaveClass(
      "border-t",
    );
    expect(screen.getByText("Core rows").closest("section")).not.toHaveClass(
      "pt-4",
    );
  });

  it("applies muted style to muted rows", () => {
    render(
      <SummaryCard>
        <SummaryCard.Section>
          <SummaryCard.Row label="예상 기간" value="필요 시 노출" muted />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("필요 시 노출")).toHaveClass(
      "text-foreground-muted",
    );
  });

  it("emphasizes total values", () => {
    render(
      <SummaryCard>
        <SummaryCard.Section>
          <SummaryCard.Total label="총 결제 금액" value="128,000원" />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("128,000원")).toHaveClass("text-lg");
    expect(screen.getByText("128,000원")).toHaveClass("font-bold");
  });

  it("aligns total label and value vertically centered", () => {
    render(
      <SummaryCard>
        <SummaryCard.Section>
          <SummaryCard.Total label="총 결제 금액" value="128,000원" />
        </SummaryCard.Section>
      </SummaryCard>,
    );

    expect(screen.getByText("총 결제 금액").closest("div")).toHaveClass(
      "items-center",
    );
  });

  it("calls onCheckedChange when consent checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <SummaryCard>
        <SummaryCard.Consent
          id="cancellation-consent"
          checked={false}
          onCheckedChange={onCheckedChange}
          label="취소/환불 불가 동의"
          description="결제 전 반드시 확인해야 하는 조건입니다."
        />
      </SummaryCard>,
    );

    await user.click(screen.getByLabelText("취소/환불 불가 동의"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders notice list items", () => {
    render(
      <SummaryCard>
        <SummaryCard.NoticeList
          items={[
            "카드에는 결제 판단에 필요한 짧은 안내만 둡니다.",
            "긴 설명은 카드 밖에서 처리합니다.",
          ]}
        />
      </SummaryCard>,
    );

    expect(
      screen.getByText("카드에는 결제 판단에 필요한 짧은 안내만 둡니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("긴 설명은 카드 밖에서 처리합니다."),
    ).toBeInTheDocument();
  });

  it("renders notice list label when provided", () => {
    render(
      <SummaryCard>
        <SummaryCard.NoticeList
          label="유의사항"
          items={["결제 전 확인하세요."]}
        />
      </SummaryCard>,
    );

    expect(screen.getByText("유의사항")).toBeInTheDocument();
    expect(screen.getByText("유의사항")).toHaveClass("text-xs");
  });

  it("does not expose page-level actions as summary card API", () => {
    expect((SummaryCard as { Actions?: unknown }).Actions).toBeUndefined();
  });
});
