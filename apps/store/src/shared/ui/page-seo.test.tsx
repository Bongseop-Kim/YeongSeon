import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { PageSeo } from "./page-seo";

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe("PageSeo", () => {
  it("일반 페이지: title에 '| ESSE SION' suffix를 붙인다", () => {
    renderWithHelmet(<PageSeo title="넥타이 쇼핑" description="테스트 설명" />);
    expect(document.title).toBe("넥타이 쇼핑 | ESSE SION");
  });

  it("fullTitle=true: suffix 없이 title 그대로 사용한다", () => {
    renderWithHelmet(
      <PageSeo
        title="ESSE SION | 맞춤 넥타이 전문 브랜드"
        description="테스트 설명"
        fullTitle
      />,
    );
    expect(document.title).toBe("ESSE SION | 맞춤 넥타이 전문 브랜드");
  });
});
