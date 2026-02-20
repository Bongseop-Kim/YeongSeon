import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductCard } from "@/features/shop/components/product-card";
import type { Product } from "@/features/shop/types/view/product";

interface CartRecommendationsCardProps {
  products: Product[];
  isMobile: boolean;
}

export function CartRecommendationsCard({
  products,
  isMobile,
}: CartRecommendationsCardProps) {
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
        <div className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-4"}`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
