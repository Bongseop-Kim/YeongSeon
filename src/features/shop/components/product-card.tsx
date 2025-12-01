import { HeartIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types/product";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/shop/${product.id}`);
  };

  return (
    <div className="cursor-pointer" onClick={handleClick}>
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
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
