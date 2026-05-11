import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PageLayout } from "@/shared/layout/page-layout";

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isMobile: false }),
}));

describe("PageLayout", () => {
  it("공통 브래드크럼을 본문보다 먼저 렌더링한다", () => {
    render(
      <MemoryRouter>
        <PageLayout
          breadcrumbs={[
            { label: "홈", to: "/" },
            { label: "넥타이 수선·리폼" },
          ]}
        >
          <section>페이지 본문</section>
        </PageLayout>
      </MemoryRouter>,
    );

    const breadcrumb = screen.getByRole("navigation", {
      name: "breadcrumb",
    });

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(breadcrumb).toHaveTextContent("넥타이 수선·리폼");
    expect(
      breadcrumb.compareDocumentPosition(screen.getByText("페이지 본문")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
