import type { Product } from "@yeongseon/shared/types/view/product";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/ROUTES";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import { padZero } from "@/lib/utils";

interface EsProductGridProps {
  items: Product[];
  isLoading?: boolean;
}

export const EsProductGrid = ({
  items,
  isLoading = false,
}: EsProductGridProps) => {
  const hasItems = items.length > 0;
  const curatedProducts = items.slice(0, 4);

  return (
    <section className="bg-[#f6f3ee] py-20 lg:py-28">
      <HomeSectionContainer>
        <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
              Ready To Wear
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-[-0.03em] text-brand-heading lg:text-4xl">
              직접 만든 자동 넥타이를 바로 구매할 수 있어요
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600">
              제작이 끝난 제품 중 지금 바로 고를 수 있는 대표 넥타이만 먼저
              보여드립니다.
            </p>
            <Link
              to={ROUTES.DESIGN}
              className="mt-4 inline-flex text-sm text-brand-accent"
            >
              주문 제작이 필요하시면 →
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="aspect-[4/4.8] w-full rounded-[18px]"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && hasItems ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {curatedProducts.map((item, index) => (
                <Link
                  key={item.id}
                  to={`${ROUTES.SHOP}/${item.id}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-[18px] border border-black/6 bg-white">
                    <div className="aspect-[4/4.8] overflow-hidden bg-[#e8e2d8]">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="border-t border-black/6 px-4 py-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-brand-heading/36">
                        {padZero(index + 1)}
                      </p>
                      <p className="mt-2 line-clamp-2 min-h-[3.5rem] text-lg font-semibold tracking-[-0.03em] text-brand-heading">
                        {item.name}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <p className="font-mono text-sm text-zinc-600">
                          {item.price.toLocaleString()}원
                        </p>
                        <span className="shrink-0 text-sm text-brand-heading/58 transition-transform duration-300 group-hover:translate-x-1">
                          자세히 보기 →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-end border-t border-black/6 pt-5 text-sm text-brand-heading/62">
              <Link to={ROUTES.SHOP} className="inline-flex text-brand-accent">
                전체 제품 보러가기 →
              </Link>
            </div>
          </>
        ) : null}

        {!isLoading && !hasItems ? (
          <p className="py-16 text-center text-zinc-500">
            상품을 불러오지 못했습니다.
          </p>
        ) : null}
      </HomeSectionContainer>
    </section>
  );
};
