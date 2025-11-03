import { Product } from "../types/product";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 mb-3">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* 뱃지 */}
        {(product.isNew || product.isPopular) && (
          <div className="absolute top-2 left-2 flex gap-1">
            {product.isNew && (
              <Badge variant="default" className="bg-blue-500">
                NEW
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="default" className="bg-rose-500">
                인기
              </Badge>
            )}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium mb-1 line-clamp-1">{product.title}</h3>
      <p className="text-sm text-zinc-600">{product.price.toLocaleString()}원</p>
    </div>
  );
};
