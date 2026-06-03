import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ProductForm, useAdminProductCreateForm } from "@/features/products";

export default function ProductCreate() {
  const formHook = useAdminProductCreateForm();

  return (
    <main className="productPage">
      <AdminPageHeader
        title="상품 생성"
        description="상품 기본 정보와 이미지를 등록합니다."
        className="productPageTitleGroup"
        titleClassName="productPageTitle"
        descriptionClassName="productPageDescription"
      />
      <ProductForm mode="create" {...formHook} />
    </main>
  );
}
