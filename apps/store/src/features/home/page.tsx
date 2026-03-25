import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { EsAiDesign } from "@/features/home/components/es-ai-design";
import { EsBrandStory } from "@/features/home/components/es-brand-story";
import { EsCta } from "@/features/home/components/es-cta";
import { EsHero } from "@/features/home/components/es-hero";
import { EsManufacturing } from "@/features/home/components/es-manufacturing";
import { EsMoldViewer } from "@/features/home/components/es-mold-viewer";
import { EsProductGrid } from "@/features/home/components/es-product-grid";
import { EsReformHighlight } from "@/features/home/components/es-reform-highlight";
import { useProducts } from "@/features/shop/api/products-query";

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
