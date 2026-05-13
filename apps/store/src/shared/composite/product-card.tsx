import type { Product } from "@yeongseon/shared/types/view/product";
import { Image } from "@imagekit/react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/constants/ROUTES";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const href = `${ROUTES.SHOP}/${product.id}`;

  return (
    <Link to={href} className="group block">
      <div className="aspect-square overflow-hidden rounded-[14px] bg-[#EAEAE6]">
        <Image
          src={product.image}
          alt={product.name}
          transformation={[{ width: 500, height: 500, quality: 80 }]}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300",
            "group-hover:scale-[1.03]",
          )}
        />
      </div>
      <div className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.35] md:mt-3 md:text-[13.5px] md:leading-[1.4]">
        {product.name}
      </div>
      <div className="mt-1 text-[13px] font-bold md:text-[14px]">
        {product.price.toLocaleString()}원
      </div>
      <div className="mt-0.5 text-[10.5px] text-[#aaa] md:text-[11px]">
        좋아요 {product.likes}
      </div>
    </Link>
  );
};

export const ProductCardSkeleton = () => (
  <div>
    <Skeleton className="aspect-square w-full rounded-[14px]" />
    <Skeleton className="mt-2.5 h-4 w-3/4 md:mt-3" />
    <Skeleton className="mt-1.5 h-4 w-1/3" />
  </div>
);
