import { List, useTable } from "@refinedev/antd";
import { Table, Image, Select, Space, Tag } from "antd";
import { useNavigation } from "@refinedev/core";

const CATEGORY_OPTIONS = [
  { label: "전체", value: "" },
  { label: "3fold", value: "3fold" },
  { label: "Sfolderato", value: "sfolderato" },
  { label: "Knit", value: "knit" },
  { label: "Bowtie", value: "bowtie" },
];

export default function ProductList() {
  const { edit } = useNavigation();

  const { tableProps, setFilters } = useTable({
    resource: "products",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="카테고리"
          allowClear
          options={CATEGORY_OPTIONS}
          onChange={(value) => {
            setFilters([
              {
                field: "category",
                operator: "eq",
                value: value || undefined,
              },
            ]);
          }}
          style={{ width: 150 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => { if (record.id != null) edit("products", record.id); },
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column
          dataIndex="image"
          title="이미지"
          render={(url: string) => (
            <Image src={url} width={50} height={50} style={{ objectFit: "cover" }} preview={false} />
          )}
        />
        <Table.Column dataIndex="code" title="코드" />
        <Table.Column dataIndex="name" title="상품명" />
        <Table.Column dataIndex="category" title="카테고리" />
        <Table.Column dataIndex="color" title="색상" />
        <Table.Column dataIndex="material" title="소재" />
        <Table.Column
          dataIndex="price"
          title="가격"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
        <Table.Column
          dataIndex="stock"
          title="재고"
          render={(v: number | null) => {
            if (v == null) return <Tag>무제한</Tag>;
            if (v === 0) return <Tag color="red">품절</Tag>;
            return v;
          }}
        />
      </Table>
    </List>
  );
}
