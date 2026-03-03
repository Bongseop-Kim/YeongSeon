import { List } from "@refinedev/antd";
import { ProductListTable } from "@/features/products/components/product-list-table";

export default function ProductList() {
  return (
    <List>
      <ProductListTable />
    </List>
  );
}
