import { ProductForm, useAdminProductCreateForm } from "@/features/products";
import "@/features/products/components/products.css";

export default function ProductCreate() {
  const formHook = useAdminProductCreateForm();

  return (
    <main className="productPage">
      <header className="productPageTitleGroup">
        <h1 className="productPageTitle">상품 생성</h1>
        <p className="productPageDescription">
          상품 기본 정보와 이미지를 등록합니다.
        </p>
      </header>
      <ProductForm mode="create" {...formHook} />
    </main>
  );
}
