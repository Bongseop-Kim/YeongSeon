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
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1 p-2">
        <p className="text-sm font-medium">{product.name}</p>
        <h3 className="text-xs font-light">{product.code}</h3>
        <p className="text-sm font-medium">
          {product.price.toLocaleString()}원
        </p>
        <p className="text-xs text-red-500 flex items-center ">
          <HeartIcon
            className="size-3 inline-block mr-1 text-red-500"
            fill="currentColor"
          />
          {product.likes}
        </p>
      </div>
    </div>
  );
};
