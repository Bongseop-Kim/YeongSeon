import type { Product } from "../types/product";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: Product[];
}

export const ProductGrid = ({ products }: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <p>조건에 맞는 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 ">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
