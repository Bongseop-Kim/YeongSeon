import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import {
  EsAiDesign,
  EsBrandStory,
  EsCta,
  EsHero,
  EsManufacturing,
  EsMoldViewer,
  EsProductGrid,
  EsReformHighlight,
} from "@/features/home";
import { useProducts } from "@/entities/shop";
import { PageSeo } from "@/shared/ui/page-seo";
import { Helmet } from "react-helmet-async";

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://essesion.shop/#organization",
      name: "ESSE SION",
      url: "https://essesion.shop",
      logo: "https://essesion.shop/logo/logo.png",
      telephone: "042-626-9055",
      address: {
        "@type": "PostalAddress",
        addressCountry: "KR",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://essesion.shop/#website",
      url: "https://essesion.shop",
      name: "ESSE SION",
      publisher: { "@id": "https://essesion.shop/#organization" },
    },
  ],
};

export default function HomePage() {
  const { data: products = [], isLoading } = useProducts({
    sortOption: "popular",
    limit: 8,
  });

  return (
    <>
      <PageSeo
        title="ESSE SION | 맞춤 넥타이 전문 브랜드"
        description="B2B 단체 제작부터 개인 맞춤 넥타이까지. 고품질 소재와 정교한 제작으로 당신만의 타이를 만들어 드립니다."
        ogUrl="https://essesion.shop/"
        fullTitle
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(HOME_JSON_LD)}
        </script>
      </Helmet>
      <MainLayout>
        <MainContent>
          <EsHero />
          <EsManufacturing />
          <EsReformHighlight />
          <EsAiDesign />
          <EsMoldViewer />
          <EsProductGrid items={products} isLoading={isLoading} />
          <EsBrandStory />
          <EsCta />
        </MainContent>
      </MainLayout>
    </>
  );
}
