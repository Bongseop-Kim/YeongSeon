import { Text } from "seed-design/ui/text";
import { ProductForm, useAdminProductCreateForm } from "@/features/products";
import "@/features/products/components/products.css";

export default function ProductCreate() {
  const formHook = useAdminProductCreateForm();

  return (
    <main className="productPage">
      <header className="productPageTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="productPageTitle">
          상품 생성
        </Text>
        <Text as="p" textStyle="t4Regular" className="productPageDescription">
          상품 기본 정보와 이미지를 등록합니다.
        </Text>
      </header>
      <ProductForm mode="create" {...formHook} />
    </main>
  );
}
