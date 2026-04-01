import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveClaimSection } from "@/features/orders/components/active-claim-section";
import type { AdminActiveClaimSummary } from "@/features/orders/types/admin-order";

const { showMock } = vi.hoisted(() => ({
  showMock: vi.fn(),
}));

vi.mock("@refinedev/core", () => ({
  useNavigation: () => ({ show: showMock }),
}));

function createClaim(
  overrides: Partial<AdminActiveClaimSummary> = {},
): AdminActiveClaimSummary {
  return {
    id: "claim-1",
    claimNumber: "CLM-001",
    type: "exchange",
    status: "접수",
    quantity: 2,
    ...overrides,
  };
}

describe("ActiveClaimSection", () => {
  beforeEach(() => {
    showMock.mockReset();
  });

  it("활성 클레임 요약 정보를 렌더링하고 상세 페이지로 이동한다", () => {
    render(<ActiveClaimSection claim={createClaim()} />);

    expect(screen.getByText("클레임번호")).toBeInTheDocument();
    expect(screen.getByText("CLM-001")).toBeInTheDocument();
    expect(screen.getByText("교환")).toBeInTheDocument();
    expect(screen.getByText("접수")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "클레임 상세 바로가기" }),
    );

    expect(showMock).toHaveBeenCalledWith("admin_claim_list_view", "claim-1");
  });
});
