import { useNavigate } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { ProductListTable } from "@/features/products";
import "@/features/products/components/products.css";

export default function ProductList() {
  const navigate = useNavigate();

  return (
    <main className="productPage">
      <header className="productPageHeader">
        <div className="productPageTitleGroup">
          <h1 className="productPageTitle">상품</h1>
          <p className="productPageDescription">
            판매 상품, 이미지, 옵션과 재고를 관리합니다.
          </p>
        </div>
        <ActionButton
          type="button"
          onClick={() => navigate("/products/create")}
        >
          상품 생성
        </ActionButton>
      </header>
      <ProductListTable />
    </main>
  );
}
