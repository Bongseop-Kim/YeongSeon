import { Edit } from "@refinedev/antd";
import { useAdminProductEditForm } from "@/features/products/api/products-query";
import { ProductForm } from "@/features/products/components/product-form";

export default function ProductEdit() {
  const formHook = useAdminProductEditForm();
  return (
    <Edit saveButtonProps={formHook.saveButtonProps}>
      <ProductForm mode="edit" {...formHook} />
    </Edit>
  );
}
