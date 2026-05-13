import type { Product } from "@yeongseon/shared/types/view/product";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/shared/composite/product-card";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid = ({
  products,
  isLoading = false,
}: ProductGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 md:gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`shop-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border-t border-zinc-200 py-24 text-center">
        <p className="text-lg font-medium text-zinc-900">
          조건에 맞는 상품이 없습니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          필터를 줄이거나 다른 정렬로 다시 찾아보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 md:gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
