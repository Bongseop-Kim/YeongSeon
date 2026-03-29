import { Edit } from "@refinedev/antd";
import { useAdminProductEditForm, ProductForm } from "@/features/products";

export default function ProductEdit() {
  const formHook = useAdminProductEditForm();
  return (
    <Edit saveButtonProps={formHook.saveButtonProps}>
      <ProductForm mode="edit" {...formHook} />
    </Edit>
  );
}
