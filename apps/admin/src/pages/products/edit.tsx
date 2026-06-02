import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import { ProductForm, useAdminProductEditForm } from "@/features/products";
import "@/features/products/components/products.css";

function parseProductId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default function ProductEdit() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = parseProductId(id);
  const formHook = useAdminProductEditForm(productId);

  if (productId === null) {
    return (
      <main className="productPage">
        <AdminPageHeader
          title="상품 수정"
          description="상품 정보를 찾을 수 없습니다."
          className="productPageTitleGroup"
          titleClassName="productPageTitle"
          descriptionClassName="productPageDescription"
        />
        <Callout tone="critical" description="올바르지 않은 상품 ID입니다." />
        <ActionButton
          type="button"
          variant="neutralWeak"
          onClick={() =>
            navigate({ pathname: "/products", search: location.search })
          }
        >
          목록으로 돌아가기
        </ActionButton>
      </main>
    );
  }

  if (formHook.detailQuery.isLoading) {
    return (
      <main className="productPage">
        <AdminPageHeader
          title="상품 수정"
          description="상품 기본 정보와 이미지, 옵션을 수정합니다."
          className="productPageTitleGroup"
          titleClassName="productPageTitle"
          descriptionClassName="productPageDescription"
        />
        <AdminPanelSkeleton lines={5} />
      </main>
    );
  }

  if (formHook.detailQuery.error) {
    return (
      <main className="productPage">
        <AdminPageHeader
          title="상품 수정"
          description="상품 정보를 불러오지 못했습니다."
          className="productPageTitleGroup"
          titleClassName="productPageTitle"
          descriptionClassName="productPageDescription"
        />
        <Callout
          tone="critical"
          description={formHook.detailQuery.error.message}
          linkProps={{
            children: "다시 시도",
            onClick: () => formHook.detailQuery.refetch(),
          }}
        />
      </main>
    );
  }

  return (
    <main className="productPage">
      <AdminPageHeader
        title="상품 수정"
        description="상품 기본 정보와 이미지, 옵션을 수정합니다."
        className="productPageTitleGroup"
        titleClassName="productPageTitle"
        descriptionClassName="productPageDescription"
      />
      <ProductForm mode="edit" {...formHook} />
    </main>
  );
}
