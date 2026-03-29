import { UtilityPageSection } from "@/shared/composite/utility-page";
import { Button } from "@/shared/ui-extended/button";
import { ProductCard } from "@/shared/composite/product-card";
import type { Product } from "@yeongseon/shared/types/view/product";

interface CartRecommendationsCardProps {
  products: Product[];
  isMobile: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function CartRecommendationsCard({
  products,
  isMobile,
  isLoading,
  isError,
  onRetry,
}: CartRecommendationsCardProps) {
  if (isLoading) {
    const skeletonCount = isMobile ? 6 : 8;
    return (
      <UtilityPageSection
        title="추천 상품"
        description="지금 장바구니에 담긴 상품과 결이 비슷한 제품입니다."
        className="pt-8"
      >
        <div className="border-t border-stone-200 pt-5">
          <div
            className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-4"} gap-2`}
          >
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md bg-zinc-200 aspect-square"
              />
            ))}
          </div>
        </div>
      </UtilityPageSection>
    );
  }

  if (isError) {
    return (
      <UtilityPageSection
        title="추천 상품"
        description="추천 목록을 불러오지 못했습니다."
        className="pt-8"
      >
        <div className="border-t border-stone-200 pt-5">
          <p className="text-sm text-zinc-500">
            추천 상품을 불러오는 중 오류가 발생했습니다.
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              다시 시도
            </Button>
          )}
        </div>
      </UtilityPageSection>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <UtilityPageSection
      title="추천 상품"
      description="함께 보면 선택 폭이 넓어지는 제품을 추렸습니다."
      className="pt-8"
    >
      <div className="border-t border-stone-200 pt-5">
        <div
          className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-4"} gap-2`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </UtilityPageSection>
  );
}
