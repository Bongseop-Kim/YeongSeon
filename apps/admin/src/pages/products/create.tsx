import { Create } from "@refinedev/antd";
import { useAdminProductCreateForm } from "@/features/products/api/products-query";
import { ProductForm } from "@/features/products/components/product-form";

export default function ProductCreate() {
  const formHook = useAdminProductCreateForm();
  return (
    <Create saveButtonProps={formHook.saveButtonProps}>
      <ProductForm mode="create" {...formHook} />
    </Create>
  );
}
