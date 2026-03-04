import { Banner } from "./banner";
import { ProductCarousel } from "./product-carousel";
import { BrandVideo } from "./brand-video";
import { InstagramFeed } from "./instagram-feed";
import { NEW_ARRIVALS_DATA } from "@/features/home/constants/NEW_ARRIVALS_DATA";
import { RECOMMENDED_DATA } from "@/features/home/constants/RECOMMENDED_DATA";

export const HomeContent = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <Banner />
      <ProductCarousel title="New Arrivals" items={NEW_ARRIVALS_DATA} />
      <ProductCarousel title="Recommended" items={RECOMMENDED_DATA} />
      <BrandVideo />
      <InstagramFeed />
    </div>
  );
};
