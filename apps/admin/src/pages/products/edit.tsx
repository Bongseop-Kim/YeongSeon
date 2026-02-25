import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, Button, Space, Card, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useList, useNavigation } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";
import { useImageKitUpload } from "@/hooks/useImageKitUpload";
import { ProductImageUpload } from "@/components/ProductImageUpload";

const CATEGORY_OPTIONS = ["3fold", "sfolderato", "knit", "bowtie"];
const COLOR_OPTIONS = ["black", "navy", "gray", "wine", "blue", "brown", "beige", "silver"];
const PATTERN_OPTIONS = ["solid", "stripe", "dot", "check", "paisley"];
const MATERIAL_OPTIONS = ["silk", "cotton", "polyester", "wool"];

export default function ProductEdit() {
  const { list } = useNavigation();
  const imageUpload = useImageKitUpload();
  const imagesInitialized = useRef(false);

  const { formProps, saveButtonProps, form, id, query: queryResult } = useForm({
    resource: "products",
    redirect: false,
    onMutationSuccess: async () => {
      const productId = Number(id);
      const options = form.getFieldValue("options") as
        | { option_id: string; name: string; additional_price: number }[]
        | undefined;

      // Replace pattern: delete existing → insert new
      await supabase
        .from("product_options")
        .delete()
        .eq("product_id", productId);

      if (options?.length) {
        await supabase.from("product_options").insert(
          options.map((opt) => ({
            product_id: productId,
            option_id: opt.option_id,
            name: opt.name,
            additional_price: opt.additional_price ?? 0,
          }))
        );
      }

      list("products");
    },
  });

  const { result: optionsResult } = useList({
    resource: "product_options",
    filters: [{ field: "product_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id },
  });

  useEffect(() => {
    if (optionsResult.data?.length) {
      form.setFieldValue(
        "options",
        optionsResult.data.map((opt) => ({
          option_id: opt.option_id,
          name: opt.name,
          additional_price: opt.additional_price,
        }))
      );
    }
  }, [optionsResult.data, form]);

  // Load existing images
  useEffect(() => {
    const product = queryResult?.data?.data;
    if (product && !imagesInitialized.current) {
      imagesInitialized.current = true;
      const detailImages = product.detail_images as string[] | null;
      const image = product.image as string | null;
      const urls = detailImages?.length ? detailImages : image ? [image] : [];
      if (urls.length > 0) {
        imageUpload.initFromUrls(urls);
      }
    }
  }, [queryResult?.data?.data, imageUpload.initFromUrls]);

  const handleFinish = async (values: Record<string, unknown>) => {
    if (imageUpload.uploading) {
      message.warning("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }

    const urls = imageUpload.getUrls();
    if (urls.length === 0) {
      message.error("최소 1개의 상품 이미지를 업로드해주세요.");
      return;
    }

    const payload = { ...values };
    delete payload.options;
    delete payload.image;
    delete payload.detail_images;
    try {
      await formProps.onFinish?.({
        ...payload,
        image: urls[0],
        detail_images: urls,
      });
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "상품 수정에 실패했습니다.",
      );
    }
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="코드" name="code" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="상품명" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="가격" name="price" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="상품 이미지">
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
          <Select options={CATEGORY_OPTIONS.map((v) => ({ label: v, value: v }))} />
        </Form.Item>
        <Form.Item label="색상" name="color" rules={[{ required: true }]}>
          <Select options={COLOR_OPTIONS.map((v) => ({ label: v, value: v }))} />
        </Form.Item>
        <Form.Item label="패턴" name="pattern" rules={[{ required: true }]}>
          <Select options={PATTERN_OPTIONS.map((v) => ({ label: v, value: v }))} />
        </Form.Item>
        <Form.Item label="소재" name="material" rules={[{ required: true }]}>
          <Select options={MATERIAL_OPTIONS.map((v) => ({ label: v, value: v }))} />
        </Form.Item>
        <Form.Item label="상품 정보" name="info" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>

        <Card title="옵션" size="small" style={{ marginBottom: 24 }}>
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item {...restField} name={[name, "option_id"]} rules={[{ required: true, message: "ID" }]}>
                      <Input placeholder="옵션 ID" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "name"]} rules={[{ required: true, message: "이름" }]}>
                      <Input placeholder="옵션명" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "additional_price"]}>
                      <InputNumber placeholder="추가금액" min={0} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  옵션 추가
                </Button>
              </>
            )}
          </Form.List>
        </Card>
      </Form>
    </Edit>
  );
}
