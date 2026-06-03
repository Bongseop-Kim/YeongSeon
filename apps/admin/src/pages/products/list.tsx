import { useLocation, useNavigate } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ProductListTable } from "@/features/products";

export default function ProductList() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <main className="productPage">
      <AdminPageHeader
        title="상품"
        description="판매 상품, 이미지, 옵션과 재고를 관리합니다."
        className="productPageHeader"
        titleGroupClassName="productPageTitleGroup"
        titleClassName="productPageTitle"
        descriptionClassName="productPageDescription"
        actions={
          <ActionButton
            type="button"
            onClick={() =>
              navigate({
                pathname: "/products/create",
                search: location.search,
              })
            }
          >
            상품 생성
          </ActionButton>
        }
      />
      <ProductListTable />
    </main>
  );
}
