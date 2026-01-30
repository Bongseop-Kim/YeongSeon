import { HeartIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import type { Product } from "@/features/shop/types/view/product";
import { Image } from "@imagekit/react";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`${ROUTES.SHOP}/${product.id}`);
  };
  console.log(product.image);
  return (
    <div className="cursor-pointer" onClick={handleClick}>
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <Image
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          transformation={[
            {
              width: 500,
              height: 500,
              quality: 80,
            },
          ]}
        />
        <div className="absolute bottom-2 right-2">
          <HeartIcon
            className={`size-5 ${
              product.isLiked
                ? "text-red-500 fill-red-500"
                : "text-white fill-gray-900/50"
            }`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <p className="text-sm font-medium">{product.name}</p>
        <h3 className="text-xs font-light">{product.code}</h3>
        <p className="text-sm font-medium">
          {product.price.toLocaleString()}원
        </p>
      </div>
    </div>
  );
};
