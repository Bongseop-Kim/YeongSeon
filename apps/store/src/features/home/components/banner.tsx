import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BANNER_DATA } from "@/features/home/constants/BANNER_DATA";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useState, useEffect } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import { useBreakpoint } from "@/providers/breakpoint-provider";

export const Banner = () => {
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section
      className={`w-full ${isMobile ? "py-4 px-4" : "py-6 px-6"}`}
    >
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[plugin.current]}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {BANNER_DATA.map((banner) => (
            <CarouselItem key={banner.id}>
              {isMobile ? (
                // 모바일 레이아웃
                <div className="relative w-full aspect-[4/5]">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 text-white">
                      <h2 className="text-3xl font-bold mb-2">
                        {banner.title}
                      </h2>
                      <p className="text-lg opacity-90">
                        {banner.description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // PC 레이아웃 - 이미지(왼쪽) : 텍스트(오른쪽) = 1:1
                <div className="flex w-full gap-8 items-center">
                <div className="w-1/2">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover rounded-lg aspect-square"
                  />
                </div>
                  <div className="w-1/2 flex items-center justify-center p-8">
                    <div className="max-w-md">
                      <h2 className="text-5xl font-bold mb-6 text-gray-900">
                        {banner.title}
                      </h2>
                      <p className="text-2xl text-gray-700">
                        {banner.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* 네비게이션 버튼 - PC에서만 표시 */}
        {!isMobile && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}

        {/* 페이지네이션 인디케이터 (Dots) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {BANNER_DATA.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all border border-zinc-200 ${
                index === current
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 border-zinc-200"
              }`}
              aria-label={`배너 ${index + 1}로 이동`}
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
};
