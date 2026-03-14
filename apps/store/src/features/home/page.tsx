import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Banner } from "./components/banner";
import { ProductCarousel } from "./components/product-carousel";
import { BrandVideo } from "./components/brand-video";
import { InstagramFeed } from "./components/instagram-feed";
import { useProducts } from "@/features/shop/api/products-query";

export default function HomePage() {
  const {
    data: newArrivals = [],
    isLoading: isNewArrivalsLoading,
    isError: isNewArrivalsError,
  } = useProducts({
    sortOption: "latest",
    limit: 8,
  });
  const {
    data: recommended = [],
    isLoading: isRecommendedLoading,
    isError: isRecommendedError,
  } = useProducts({
    sortOption: "popular",
    limit: 8,
  });

  if (isNewArrivalsError || isRecommendedError) {
    return (
      <MainLayout>
        <MainContent>
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-zinc-500 py-16">
              상품을 불러오지 못했습니다.
            </p>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

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
