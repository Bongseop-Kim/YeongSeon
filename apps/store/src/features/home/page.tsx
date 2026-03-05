import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Banner } from "./components/banner";
import { ProductCarousel } from "./components/product-carousel";
import { BrandVideo } from "./components/brand-video";
import { InstagramFeed } from "./components/instagram-feed";
import { useProducts } from "@/features/shop/api/products-query";

export default function HomePage() {
  const { data: newArrivals = [], isLoading: isNewArrivalsLoading } = useProducts({
    sortOption: "latest",
    limit: 8,
  });
  const { data: recommended = [], isLoading: isRecommendedLoading } = useProducts({
    sortOption: "popular",
    limit: 8,
  });

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-7xl mx-auto">
          <Banner />
          <ProductCarousel
            title="New Arrivals"
            items={newArrivals}
            isLoading={isNewArrivalsLoading}
          />
          <ProductCarousel
            title="Recommended"
            items={recommended}
            isLoading={isRecommendedLoading}
          />
          <BrandVideo />
          <InstagramFeed />
        </div>
      </MainContent>
    </MainLayout>
  );
}
