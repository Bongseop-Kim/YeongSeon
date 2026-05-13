import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PageLayout } from "@/shared/layout/page-layout";

let isMobile = false;

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isMobile }),
}));

describe("PageLayout", () => {
  beforeEach(() => {
    isMobile = false;
  });

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

  it("데스크톱에서 사이드바가 있으면 본문에 데스크톱 폭 클래스를 적용한다", () => {
    render(
      <MemoryRouter>
        <PageLayout sidebar={<aside>사이드바</aside>}>
          <main>페이지 본문</main>
        </PageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-layout-content")).toHaveClass(
      "flex-1",
      "w-2/3",
    );
  });

  it("모바일에서는 사이드바가 있어도 본문을 전체 폭으로 렌더링한다", () => {
    isMobile = true;

    render(
      <MemoryRouter>
        <PageLayout sidebar={<aside>사이드바</aside>}>
          <main>페이지 본문</main>
        </PageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-layout-content")).toHaveClass("w-full");
    expect(screen.getByTestId("page-layout-content")).not.toHaveClass("w-2/3");
  });

  it("데스크톱 사이드바에 sticky 위치 클래스를 적용한다", () => {
    render(
      <MemoryRouter>
        <PageLayout sidebar={<aside>사이드바</aside>}>
          <main>페이지 본문</main>
        </PageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-layout-sidebar")).toHaveClass("sticky");
  });
});
