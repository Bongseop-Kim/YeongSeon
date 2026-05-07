import type { Product } from "@yeongseon/shared/types/view/product";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/constants/ROUTES";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/shared/composite/product-card";

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
          지금 가장 많이 찾는 넥타이
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
          : curated.map((item) => <ProductCard key={item.id} product={item} />)}
      </div>

      {!isLoading && curated.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          상품을 불러오지 못했습니다.
        </p>
      ) : null}
    </section>
  );
};
