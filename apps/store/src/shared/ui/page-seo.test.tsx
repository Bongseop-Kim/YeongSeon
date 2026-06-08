import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { PageSeo } from "@/shared/ui/page-seo";

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe("PageSeo", () => {
  it("일반 페이지: title에 '| 영선산업' suffix를 붙인다", () => {
    renderWithHelmet(<PageSeo title="넥타이 쇼핑" description="테스트 설명" />);
    expect(document.title).toBe("넥타이 쇼핑 | 영선산업");
  });

  it("fullTitle=true: suffix 없이 title 그대로 사용한다", () => {
    renderWithHelmet(
      <PageSeo
        title="영선산업 | 맞춤 넥타이 제작·수선 전문"
        description="테스트 설명"
        fullTitle
      />,
    );
    expect(document.title).toBe("영선산업 | 맞춤 넥타이 제작·수선 전문");
  });

  it("siteName이 있으면 지정한 suffix와 og:site_name을 사용한다", () => {
    renderWithHelmet(
      <PageSeo
        title="넥타이 쇼핑"
        description="테스트 설명"
        siteName="ESSE SION"
      />,
    );
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    expect(document.title).toBe("넥타이 쇼핑 | ESSE SION");
    expect(ogSiteName?.getAttribute("content")).toBe("ESSE SION");
  });

  it("ogUrl이 있으면 canonical link를 렌더링한다", () => {
    renderWithHelmet(
      <PageSeo
        title="쇼핑"
        description="테스트"
        ogUrl="https://essesion.shop/shop"
      />,
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical?.getAttribute("href")).toBe("https://essesion.shop/shop");
  });

  it("ogUrl이 없으면 canonical link를 렌더링하지 않는다", () => {
    renderWithHelmet(<PageSeo title="쇼핑" description="테스트" />);
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toBeNull();
  });

  it("twitter:card 메타 태그를 렌더링한다", () => {
    renderWithHelmet(<PageSeo title="쇼핑" description="테스트" />);
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    expect(twitterCard).not.toBeNull();
    expect(twitterCard?.getAttribute("content")).toBe("summary_large_image");
  });

  it("twitter:title이 og:title과 동일한 값을 사용한다", () => {
    renderWithHelmet(<PageSeo title="넥타이 쇼핑" description="테스트" />);
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    expect(twitterTitle?.getAttribute("content")).toBe(
      "넥타이 쇼핑 | 영선산업",
    );
  });

  it("twitter:description이 description과 동일한 값을 사용한다", () => {
    renderWithHelmet(<PageSeo title="쇼핑" description="ESSE SION 쇼핑" />);
    const twitterDesc = document.querySelector(
      'meta[name="twitter:description"]',
    );
    expect(twitterDesc?.getAttribute("content")).toBe("ESSE SION 쇼핑");
  });
});
