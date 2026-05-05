import type { Product } from "@yeongseon/shared/types/view/product";
import { Image } from "@imagekit/react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/constants/ROUTES";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface EsProductGridProps {
  items: Product[];
  isLoading?: boolean;
}

export const EsProductGrid = ({
  items,
  isLoading = false,
}: EsProductGridProps) => {
  const curated = items.slice(0, 4);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 md:px-6">
      <div className="flex items-end justify-between pb-3 pt-9 md:pb-3 md:pt-14">
        <h2 className="m-0 text-[18px] font-bold tracking-[-0.03em] md:text-2xl">
          이번 주 잘 나가는 넥타이
        </h2>
        <Link
          to={ROUTES.SHOP}
          className="cursor-pointer text-[12.5px] text-[#999] md:text-[13.5px] md:text-[#555]"
        >
          전체 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 md:grid-cols-4 md:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          : curated.map((item) => <ProductCard key={item.id} item={item} />)}
      </div>

      {!isLoading && curated.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          상품을 불러오지 못했습니다.
        </p>
      ) : null}
    </section>
  );
};

const ProductCard = ({ item }: { item: Product }) => (
  <Link to={`${ROUTES.SHOP}/${item.id}`} className="group block">
    <div className="aspect-square overflow-hidden rounded-[14px] bg-[#EAEAE6]">
      <Image
        src={item.image}
        alt={item.name}
        transformation={[{ width: 500, height: 500, quality: 80 }]}
        className={cn(
          "h-full w-full object-cover transition-transform duration-300",
          "group-hover:scale-[1.03]",
        )}
      />
    </div>
    <div className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.35] md:mt-3 md:text-[13.5px] md:leading-[1.4]">
      {item.name}
    </div>
    <div className="mt-1 text-[13px] font-bold md:text-[14px]">
      {item.price.toLocaleString()}원
    </div>
    <div className="mt-0.5 text-[10.5px] text-[#aaa] md:text-[11px]">
      좋아요 {item.likes}
    </div>
  </Link>
);

const ProductCardSkeleton = () => (
  <div>
    <Skeleton className="aspect-square w-full rounded-[14px]" />
    <Skeleton className="mt-2.5 h-4 w-3/4 md:mt-3" />
    <Skeleton className="mt-1.5 h-4 w-1/3" />
  </div>
);
