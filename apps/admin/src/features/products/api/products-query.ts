import { useEffect, useRef } from "react";
import { useForm, useTable } from "@refinedev/antd";
import { useList, useNavigation } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import { useImageKitUpload } from "@/hooks/useImageKitUpload";
import { insertProductOptions, saveProductOptions } from "./products-api";
import {
  toAdminProductListItem,
  toAdminProductOption,
} from "./products-mapper";
import type {
  AdminProductListItem,
  AdminProductOption,
} from "../types/admin-product";

interface AdminProductRecord {
  id: number;
  code: string | null;
  name: string;
  category: string;
  color: string;
  pattern: string;
  material: string;
  info: string;
  price: number;
  stock: number | null;
  image: string | null;
  detail_images: string[] | null;
  option_label: string | null;
}

interface AdminProductFormValues {
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

interface ProductOptionRecord {
  name: string | null;
  additional_price: number | null;
  stock: number | null;
  product_id: number;
}

function toProductId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function toAdminProductOptions(value: unknown): AdminProductOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => {
      if (typeof option !== "object" || option == null) {
        return null;
      }

      const name =
        "name" in option && typeof option.name === "string" ? option.name : "";
      const additionalPrice =
        "additionalPrice" in option ? toNumber(option.additionalPrice) : 0;
      const stock = "stock" in option ? toOptionalNumber(option.stock) : null;

      return {
        name,
        additionalPrice,
        stock,
      };
    })
    .filter((option): option is AdminProductOption => option !== null);
}

export function useAdminProductTable() {
  const { tableProps: rawTableProps, setFilters } =
    useTable<AdminProductListItem>({
      resource: "products",
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      syncWithLocation: true,
    });

  const tableProps: TableProps<AdminProductListItem> = {
    ...rawTableProps,
    dataSource: (rawTableProps.dataSource ?? []).map(toAdminProductListItem),
  };

  return { tableProps, setFilters };
}

function normalizeProductSubmit(
  values: AdminProductFormValues,
  imageUpload: ReturnType<typeof useImageKitUpload>,
): AdminProductFormValues | null {
  if (imageUpload.uploading) {
    message.warning("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도하세요.");
    return null;
  }

  const urls = imageUpload.getUrls();
  if (urls.length === 0) {
    message.error("최소 1개의 상품 이미지를 업로드해주세요.");
    return null;
  }

  const payload = { ...values };
  const hasOptions = Array.isArray(values.options) && values.options.length > 0;
  delete payload.options;
  delete payload.image;
  delete payload.detail_images;

  return {
    ...payload,
    image: urls[0],
    detail_images: urls,
    ...(hasOptions ? { stock: null } : {}),
  };
}

export function useAdminProductCreateForm() {
  const { list } = useNavigation();
  const imageUpload = useImageKitUpload();

  const { formProps, saveButtonProps, form } = useForm<
    AdminProductRecord,
    HttpError,
    AdminProductFormValues
  >({
    resource: "products",
    redirect: false,
    onMutationSuccess: async (data) => {
      const productId = toProductId(data?.data?.id);
      const options = toAdminProductOptions(form.getFieldValue("options"));

      try {
        if (productId !== null && options.length > 0) {
          await insertProductOptions({ productId, options });
        }
      } catch (err) {
        message.error(
          err instanceof Error ? err.message : "옵션 저장에 실패했습니다.",
        );
      } finally {
        list("products");
      }
    },
  });

  const handleFinish = async (values: AdminProductFormValues) => {
    const payload = normalizeProductSubmit(values, imageUpload);
    if (payload === null) return;
    await formProps.onFinish?.({ ...payload, code: null });
  };

  return { formProps, saveButtonProps, form, imageUpload, handleFinish };
}

export function useAdminProductEditForm() {
  const { list } = useNavigation();
  const imageUpload = useImageKitUpload();
  const imagesInitialized = useRef(false);

  const {
    formProps,
    saveButtonProps,
    form,
    id,
    query: queryResult,
  } = useForm<AdminProductRecord, HttpError, AdminProductFormValues>({
    resource: "products",
    redirect: false,
    onMutationSuccess: async () => {
      const productId = toProductId(id);
      const options = toAdminProductOptions(form.getFieldValue("options"));

      if (productId !== null) {
        try {
          await saveProductOptions({ productId, options });
        } catch (err) {
          message.error(
            err instanceof Error ? err.message : "옵션 저장에 실패했습니다.",
          );
          return;
        }
      }

      list("products");
    },
  });

  const { result: optionsData } = useList<ProductOptionRecord>({
    resource: "product_options",
    filters: [{ field: "product_id", operator: "eq", value: id }],
    queryOptions: { enabled: !!id },
  });

  useEffect(() => {
    form.setFieldValue("options", []);
    if (optionsData?.data !== undefined) {
      form.setFieldValue("options", optionsData.data.map(toAdminProductOption));
    }
  }, [id, optionsData?.data, form]);

  useEffect(() => {
    imagesInitialized.current = false;
  }, [id]);

  useEffect(() => {
    const product = queryResult?.data?.data;
    if (
      product &&
      !imagesInitialized.current &&
      product.id === toProductId(id)
    ) {
      imagesInitialized.current = true;
      const urls =
        product.detail_images && product.detail_images.length > 0
          ? product.detail_images
          : product.image
            ? [product.image]
            : [];
      imageUpload.initFromUrls(urls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- imagesInitialized ref는 deps 불필요, imageUpload.initFromUrls는 비안정 참조
  }, [queryResult?.data?.data, imageUpload.initFromUrls, id]);

  const handleFinish = async (values: AdminProductFormValues) => {
    const payload = normalizeProductSubmit(values, imageUpload);
    if (payload === null) return;
    try {
      await formProps.onFinish?.(payload);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "상품 수정에 실패했습니다.",
      );
    }
  };

  return { formProps, saveButtonProps, form, id, imageUpload, handleFinish };
}
