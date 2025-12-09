import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useState, useEffect } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

// 임시 광고 데이터 (서버에서 관리 예정)
const AD_DATA = [
  {
    id: 1,
    imageUrl: "/images/banner/banner1.png",
    title: "무신사 후기왕",
    description: "100만원 적립금의 후기왕에 도전해보세요",
    linkUrl: "/promotion/review",
    backgroundColor: "bg-green-800",
  },
  {
    id: 2,
    imageUrl: "/images/banner/banner2.png",
    title: "신규 회원 혜택",
    description: "첫 구매 시 10% 할인 쿠폰을 받아보세요",
    linkUrl: "/promotion/new-member",
    backgroundColor: "bg-blue-800",
  },
  {
    id: 3,
    imageUrl: "/images/banner/banner3.png",
    title: "시즌 오프 세일",
    description: "최대 50% 할인으로 만나보는 특별한 기회",
    linkUrl: "/promotion/sale",
    backgroundColor: "bg-zinc-800",
  },
];

export const AdPanel = () => {
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="w-full">
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
          {AD_DATA.map((ad) => (
            <CarouselItem key={ad.id}>
              <a
                href={ad.linkUrl}
                className={`block w-full ${ad.backgroundColor} rounded-lg overflow-hidden transition-opacity`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* 왼쪽 이미지 - 고정 사이즈 */}
                  <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 오른쪽 텍스트 영역 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm mb-0.5 truncate">
                      {ad.title}
                    </h3>
                    <p className="text-white/90 text-xs truncate">
                      {ad.description}
                    </p>
                  </div>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* 캐로셀 인디케이터 */}
      <div className="flex justify-center gap-2 mt-2">
        {AD_DATA.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-8 bg-zinc-600" : "w-2 bg-zinc-400"
            }`}
            aria-label={`광고 ${index + 1}로 이동`}
          />
        ))}
      </div>
    </div>
  );
};
