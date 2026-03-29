import type { Product } from "@yeongseon/shared/types/view/product";
import { ProductCard } from "@/shared/composite/product-card";

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
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-5 xl:grid-cols-4 xl:gap-y-12">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`shop-skeleton-${index}`} className="animate-pulse">
            <div className="aspect-[4/4.9] bg-zinc-100" />
            <div className="mt-4 h-3 w-16 bg-zinc-100" />
            <div className="mt-3 h-5 w-4/5 bg-zinc-100" />
            <div className="mt-2 h-4 w-24 bg-zinc-100" />
          </div>
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
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-5 xl:grid-cols-4 xl:gap-y-12">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
