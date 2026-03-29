import { List } from "@refinedev/antd";
import { ProductListTable } from "@/features/products";

export default function ProductList() {
  return (
    <List>
      <ProductListTable />
    </List>
  );
}
