import { Banner } from "./banner";
import { ProductCarousel } from "./product-carousel";
import { BrandVideo } from "./brand-video";
import { InstagramFeed } from "./instagram-feed";
import { useProducts } from "@/features/shop/api/products-query";

export const HomeContent = () => {
  const { data: newArrivals = [] } = useProducts({ sortOption: "latest", limit: 8 });
  const { data: recommended = [] } = useProducts({ sortOption: "popular", limit: 8 });

  return (
    <div className="max-w-7xl mx-auto">
      <Banner />
      <ProductCarousel title="New Arrivals" items={newArrivals} />
      <ProductCarousel title="Recommended" items={recommended} />
      <BrandVideo />
      <InstagramFeed />
    </div>
  );
};
