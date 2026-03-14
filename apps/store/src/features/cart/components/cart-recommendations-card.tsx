import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/shop/components/product-card";
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
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>추천 상품</CardTitle>
          <CardDescription>
            이 상품과 함께 보면 좋은 추천 상품들을 확인해보세요
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>추천 상품</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className="bg-zinc-100">
      <CardHeader>
        <CardTitle>추천 상품</CardTitle>
        <CardDescription>
          이 상품과 함께 보면 좋은 추천 상품들을 확인해보세요
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div
          className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-4"} gap-2`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
