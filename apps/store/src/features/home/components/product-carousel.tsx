import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@yeongseon/shared/types/view/product";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";

interface ProductCarouselProps {
  title: string;
  items: Product[];
  isLoading?: boolean;
}

export const ProductCarousel = ({
  title,
  items,
  isLoading = false,
}: ProductCarouselProps) => {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const skeletonCount = isMobile ? 4 : 8;

  return (
    <div className="w-full py-8 overflow-x-hidden">
      <div className="px-4">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
      </div>
      <div className="px-4">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {isLoading
              ? Array.from({ length: skeletonCount }).map((_, index) => (
                  <CarouselItem
                    key={`skeleton-${index}`}
                    className={isMobile ? "basis-1/2" : "basis-1/4"}
                  >
                    <div>
                      <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CarouselItem>
                ))
              : items.map((item) => (
                  <CarouselItem
                    key={item.id}
                    className={isMobile ? "basis-1/2" : "basis-1/4"}
                    onClick={() => {
                      navigate(`${ROUTES.SHOP}/${item.id}`);
                    }}
                  >
                    <div className="group cursor-pointer">
                      <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100 mb-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300"
                        />
                      </div>
                      <h3 className="text-sm font-medium mb-1">{item.name}</h3>
                      <p className="text-sm text-zinc-600">
                        {item.price.toLocaleString()}원
                      </p>
                    </div>
                  </CarouselItem>
                ))}
          </CarouselContent>
          {!isMobile && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
      </div>
    </div>
  );
};
