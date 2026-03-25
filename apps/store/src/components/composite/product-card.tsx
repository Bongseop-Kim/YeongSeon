import { HeartIcon } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import type { Product } from "@yeongseon/shared/types/view/product";
import { Image } from "@imagekit/react";
import {
  getCategoryLabel,
  getMaterialLabel,
} from "@/features/shop/constants/PRODUCT_LABELS";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const options = product.options ?? [];
  const isSoldOut =
    options.length > 0
      ? options.every((o) => o.stock === 0)
      : product.stock === 0;

  const handleClick = () => {
    navigate(`${ROUTES.SHOP}/${product.id}`);
  };

  return (
    <motion.div
      whileHover={isSoldOut ? undefined : { y: -6 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`group cursor-pointer ${isSoldOut ? "opacity-60 pointer-events-none" : ""}`}
      onClick={handleClick}
    >
      <div className="relative aspect-[4/4.9] overflow-hidden bg-zinc-100">
        <Image
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          transformation={[
            {
              width: 500,
              height: 500,
              quality: 80,
            },
          ]}
        />
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full border border-white/40 bg-black/30 px-4 py-1 text-sm font-semibold tracking-[0.2em] text-white">
              SOLD OUT
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="bg-white/88 px-2 py-1 text-[10px] font-medium tracking-[0.24em] text-zinc-700 backdrop-blur">
            {getCategoryLabel(product.category)}
          </span>
        </div>
        {product.likes > 0 ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur">
            <HeartIcon
              className={`size-3 ${
                product.isLiked
                  ? "fill-red-400 text-red-400"
                  : "fill-white/20 text-white/80"
              }`}
            />
            <span>{product.likes}</span>
          </div>
        ) : null}
      </div>
      <div className="border-b border-zinc-200 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
          <span>{getMaterialLabel(product.material)}</span>
          <span>{product.code}</span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-11 text-[15px] font-medium leading-6 text-zinc-900">
          {product.name}
        </p>
        <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-zinc-900">
          {product.price.toLocaleString()}원
        </p>
      </div>
    </motion.div>
  );
};
