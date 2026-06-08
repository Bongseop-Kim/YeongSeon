import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { EsLanding } from "@/features/home";
import { useProducts } from "@/entities/shop";
import { PageSeo } from "@/shared/ui/page-seo";
import { Helmet } from "react-helmet-async";

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://essesion.shop/#organization",
      name: "영선산업",
      alternateName: ["ESSE SION", "essesion"],
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
      name: "영선산업",
      alternateName: "ESSE SION",
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
        title="영선산업 | 맞춤 넥타이 제작·수선 전문"
        description="영선산업은 맞춤 넥타이 제작, 단체 넥타이, 샘플 주문, 넥타이 수선·리폼을 운영합니다. 넥타이 판매 브랜드 ESSE SION을 함께 운영합니다."
        ogUrl="https://essesion.shop"
        fullTitle
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(HOME_JSON_LD)}
        </script>
      </Helmet>
      <MainLayout>
        <MainContent>
          <EsLanding products={products} isProductsLoading={isLoading} />
        </MainContent>
      </MainLayout>
    </>
  );
}
