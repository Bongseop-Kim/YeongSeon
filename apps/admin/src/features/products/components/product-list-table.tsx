import React from "react";
import { useNavigation } from "@refinedev/core";
import { Image, Select, Space, Table, Tag } from "antd";
import { useAdminProductTable } from "../api/products-query";
import { CATEGORY_FILTER_OPTIONS } from "../types/admin-product";
import type { AdminProductListItem } from "../types/admin-product";

export function ProductListTable() {
  const { edit } = useNavigation();
  const { tableProps, setFilters } = useAdminProductTable();

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="카테고리"
          allowClear
          options={CATEGORY_FILTER_OPTIONS}
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
        onRow={(record: AdminProductListItem) => ({
          onClick: () => {
            if (record.id != null) edit("products", record.id);
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
            if ((e.key === "Enter" || e.key === " ") && record.id != null) {
              e.preventDefault();
              edit("products", record.id);
            }
          },
          tabIndex: 0,
          "aria-label": `${record.name} 상품 수정`,
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column
          dataIndex="image"
          title="이미지"
          render={(url: string | null) => (
            <Image
              src={url ?? undefined}
              width={50}
              height={50}
              style={{ objectFit: "cover" }}
              preview={false}
            />
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
          render={(value: number) => `${value?.toLocaleString()}원`}
        />
        <Table.Column
          dataIndex="stock"
          title="재고"
          render={(value: number | null) => {
            if (value == null) return <Tag>무제한</Tag>;
            if (value === 0) return <Tag color="red">품절</Tag>;
            return value;
          }}
        />
      </Table>
    </>
  );
}
