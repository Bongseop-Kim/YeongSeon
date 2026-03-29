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

export default function HomePage() {
  const { data: products = [], isLoading } = useProducts({
    sortOption: "popular",
    limit: 8,
  });

  return (
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
  );
}
