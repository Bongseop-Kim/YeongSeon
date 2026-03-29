import { Create } from "@refinedev/antd";
import { useAdminProductCreateForm, ProductForm } from "@/features/products";

export default function ProductCreate() {
  const formHook = useAdminProductCreateForm();
  return (
    <Create saveButtonProps={formHook.saveButtonProps}>
      <ProductForm mode="create" {...formHook} />
    </Create>
  );
}
