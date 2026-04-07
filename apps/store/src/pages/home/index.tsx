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
