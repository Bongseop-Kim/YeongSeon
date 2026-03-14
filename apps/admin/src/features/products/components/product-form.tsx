import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, InputNumber, Select, Space } from "antd";
import type { FormInstance, FormProps } from "antd";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import type { useImageKitUpload } from "@/hooks/useImageKitUpload";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_MATERIALS,
  PRODUCT_PATTERNS,
} from "../types/admin-product";
import type { AdminProductOption } from "../types/admin-product";

interface ProductFormValues {
  code?: string | null;
  name?: string;
  category?: string;
  color?: string;
  pattern?: string;
  material?: string;
  info?: string;
  price?: number;
  stock?: number | null;
  image?: string | null;
  detail_images?: string[] | null;
  options?: AdminProductOption[];
  option_label?: string | null;
}

export interface ProductFormProps {
  mode: "create" | "edit";
  formProps: FormProps<ProductFormValues>;
  form: FormInstance<ProductFormValues>;
  imageUpload: ReturnType<typeof useImageKitUpload>;
  handleFinish: (values: ProductFormValues) => Promise<void>;
}

export function ProductForm({
  mode,
  formProps,
  form,
  imageUpload,
  handleFinish,
}: ProductFormProps) {
  const options = Form.useWatch("options", form);
  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <Form {...formProps} form={form} layout="vertical" onFinish={handleFinish}>
      {mode === "edit" ? (
        <Form.Item label="코드" name="code">
          <Input disabled />
        </Form.Item>
      ) : (
        <Form.Item label="코드">
          <Input disabled placeholder="카테고리 선택 후 자동 생성됩니다" />
        </Form.Item>
      )}

      <Form.Item label="상품명" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="가격" name="price" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item label="상품 이미지" style={{ marginBottom: 60 }}>
        <ProductImageUpload
          fileList={imageUpload.fileList}
          uploading={imageUpload.uploading}
          customRequest={imageUpload.customRequest}
          onChange={imageUpload.handleChange}
          onRemove={imageUpload.handleRemove}
          onMove={imageUpload.moveFile}
        />
      </Form.Item>

      <Form.Item label="카테고리" name="category" rules={[{ required: true }]}>
        <Select
          options={PRODUCT_CATEGORIES.map((v) => ({ label: v, value: v }))}
        />
      </Form.Item>
      <Form.Item label="색상" name="color" rules={[{ required: true }]}>
        <Select options={PRODUCT_COLORS.map((v) => ({ label: v, value: v }))} />
      </Form.Item>
      <Form.Item label="패턴" name="pattern" rules={[{ required: true }]}>
        <Select
          options={PRODUCT_PATTERNS.map((v) => ({ label: v, value: v }))}
        />
      </Form.Item>
      <Form.Item label="소재" name="material" rules={[{ required: true }]}>
        <Select
          options={PRODUCT_MATERIALS.map((v) => ({ label: v, value: v }))}
        />
      </Form.Item>
      <Form.Item label="상품 정보" name="info" rules={[{ required: true }]}>
        <Input.TextArea rows={4} />
      </Form.Item>
      {!hasOptions && (
        <Form.Item
          label="재고"
          name="stock"
          tooltip="비워두면 무제한"
          preserve={false}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            placeholder="비워두면 무제한"
          />
        </Form.Item>
      )}

      <Card title="옵션" size="small" style={{ marginBottom: 24 }}>
        {hasOptions && (
          <Form.Item label="옵션 제목" name="option_label" preserve={false}>
            <Input placeholder="예: 길이, 색상, 사이즈" />
          </Form.Item>
        )}
        <Form.List name="options">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  wrap
                  style={{ display: "flex", marginBottom: 8 }}
                  align="baseline"
                >
                  <Form.Item
                    {...restField}
                    name={[name, "name"]}
                    rules={[{ required: true, message: "이름" }]}
                  >
                    <Input placeholder="옵션명" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "additionalPrice"]}>
                    <InputNumber placeholder="추가금액" min={0} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "stock"]}>
                    <InputNumber placeholder="재고 (무제한)" min={0} />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                옵션 추가
              </Button>
            </>
          )}
        </Form.List>
      </Card>
    </Form>
  );
}
