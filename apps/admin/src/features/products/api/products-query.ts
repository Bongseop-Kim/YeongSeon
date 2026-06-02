import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useImageKitUpload } from "@/hooks/useImageKitUpload";
import {
  createProduct,
  getAdminProductDetail,
  getAdminProducts,
  updateProduct,
} from "./products-api";
import { toAdminProductFormValues } from "@/features/products/api/products-mapper";
import type {
  AdminProductFormOption,
  AdminProductFormValues,
  AdminProductOption,
} from "@/features/products/types/admin-product";

export const PRODUCT_PAGE_SIZE = 20;

const PRODUCT_LIST_KEY = ["products", "list"] as const;
const PRODUCT_DETAIL_KEY = ["products", "detail"] as const;

export const EMPTY_PRODUCT_FORM_VALUES: AdminProductFormValues = {
  code: null,
  name: "",
  category: "",
  color: "",
  pattern: "",
  material: "",
  info: "",
  price: null,
  stock: null,
  optionLabel: "",
  options: [],
};

export function useAdminProductTable(params: {
  page: number;
  category?: string | null;
}) {
  return useQuery({
    queryKey: [...PRODUCT_LIST_KEY, params.page, params.category ?? null],
    queryFn: () =>
      getAdminProducts({
        page: params.page,
        pageSize: PRODUCT_PAGE_SIZE,
        category: params.category ?? null,
      }),
  });
}

export function useAdminProductDetail(productId: number | null) {
  return useQuery({
    queryKey: [...PRODUCT_DETAIL_KEY, productId],
    queryFn: () => getAdminProductDetail(productId ?? 0),
    enabled: productId !== null,
  });
}

function normalizeOptions(
  options: AdminProductFormOption[],
): AdminProductFormOption[] {
  return options
    .map((option) => ({
      formKey: option.formKey,
      name: option.name.trim(),
      additionalPrice: option.additionalPrice || 0,
      stock: option.stock,
    }))
    .filter((option) => option.name !== "");
}

function getProductImageUrls(product: {
  detailImages: string[];
  image: string | null;
}): string[] {
  if (product.detailImages.length > 0) return product.detailImages;
  if (product.image) return [product.image];
  return [];
}

function validateProductForm(values: AdminProductFormValues): string | null {
  if (!values.name.trim()) return "상품명을 입력해주세요.";
  if (values.price === null || values.price < 0) return "가격을 입력해주세요.";
  if (!values.category) return "카테고리를 선택해주세요.";
  if (!values.color) return "색상을 선택해주세요.";
  if (!values.pattern) return "패턴을 선택해주세요.";
  if (!values.material) return "소재를 선택해주세요.";
  if (!values.info.trim()) return "상품 정보를 입력해주세요.";
  if (values.stock !== null && values.stock < 0) {
    return "재고는 0 이상이어야 합니다.";
  }
  if (
    values.options.some(
      (option) =>
        option.additionalPrice < 0 ||
        (option.stock !== null && option.stock < 0),
    )
  ) {
    return "옵션 금액과 재고는 0 이상이어야 합니다.";
  }
  return null;
}

function useProductFormState(initialValues = EMPTY_PRODUCT_FORM_VALUES) {
  const optionKeyRef = useRef(0);
  const [values, setValues] = useState<AdminProductFormValues>(initialValues);

  const setField = useCallback(
    <K extends keyof AdminProductFormValues>(
      key: K,
      value: AdminProductFormValues[K],
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setOption = useCallback(
    (index: number, patch: Partial<AdminProductOption>): void => {
      setValues((prev) => ({
        ...prev,
        options: prev.options.map((option, optionIndex) =>
          optionIndex === index ? { ...option, ...patch } : option,
        ),
      }));
    },
    [],
  );

  const addOption = useCallback((): void => {
    const formKey = `new-${++optionKeyRef.current}`;

    setValues((prev) => ({
      ...prev,
      stock: null,
      options: [
        ...prev.options,
        { formKey, name: "", additionalPrice: 0, stock: null },
      ],
    }));
  }, []);

  const removeOption = useCallback((index: number): void => {
    setValues((prev) => ({
      ...prev,
      options: prev.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }, []);

  return { values, setValues, setField, setOption, addOption, removeOption };
}

export function useAdminProductCreateForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageUpload = useImageKitUpload();
  const formState = useProductFormState();
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: AdminProductFormValues) =>
      createProduct({ values, imageUrls: imageUpload.getUrls() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_LIST_KEY });
      navigate({ pathname: "/products", search: location.search });
    },
  });

  const handleSubmit = async (): Promise<void> => {
    setValidationError(null);
    if (imageUpload.uploading) {
      setValidationError(
        "이미지 업로드가 진행 중입니다. 잠시 후 다시 시도하세요.",
      );
      return;
    }
    if (imageUpload.getUrls().length === 0) {
      setValidationError("최소 1개의 상품 이미지를 업로드해주세요.");
      return;
    }

    const nextValues = {
      ...formState.values,
      options: normalizeOptions(formState.values.options),
    };
    const error = validateProductForm(nextValues);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await mutation.mutateAsync(nextValues);
    } catch {
      // mutation.error로 렌더링한다.
    }
  };

  return {
    ...formState,
    imageUpload,
    handleSubmit,
    validationError,
    submitError: mutation.error,
    isSubmitting: mutation.isPending,
  };
}

export function useAdminProductEditForm(productId: number | null) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageUpload = useImageKitUpload();
  const detailQuery = useAdminProductDetail(productId);
  const initialValues = useMemo(
    () =>
      detailQuery.data
        ? toAdminProductFormValues(detailQuery.data)
        : EMPTY_PRODUCT_FORM_VALUES,
    [detailQuery.data],
  );
  const formState = useProductFormState(initialValues);
  const { setValues } = formState;
  const { initFromUrls } = imageUpload;
  const [hydratedProductId, setHydratedProductId] = useState<number | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: AdminProductFormValues) => {
      if (productId === null) throw new Error("상품 정보를 찾을 수 없습니다.");
      return updateProduct({
        productId,
        values,
        imageUrls: imageUpload.getUrls(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCT_LIST_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...PRODUCT_DETAIL_KEY, productId],
        }),
      ]);
      navigate({ pathname: "/products", search: location.search });
    },
  });

  useEffect(() => {
    if (!detailQuery.data || hydratedProductId === detailQuery.data.id) return;

    setHydratedProductId(detailQuery.data.id);
    setValues(toAdminProductFormValues(detailQuery.data));
    initFromUrls(getProductImageUrls(detailQuery.data));
  }, [detailQuery.data, hydratedProductId, initFromUrls, setValues]);

  const handleSubmit = async (): Promise<void> => {
    setValidationError(null);
    if (imageUpload.uploading) {
      setValidationError(
        "이미지 업로드가 진행 중입니다. 잠시 후 다시 시도하세요.",
      );
      return;
    }
    if (imageUpload.getUrls().length === 0) {
      setValidationError("최소 1개의 상품 이미지를 업로드해주세요.");
      return;
    }

    const nextValues = {
      ...formState.values,
      options: normalizeOptions(formState.values.options),
    };
    const error = validateProductForm(nextValues);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await mutation.mutateAsync(nextValues);
    } catch {
      // mutation.error로 렌더링한다.
    }
  };

  return {
    ...formState,
    detailQuery,
    imageUpload,
    handleSubmit,
    validationError,
    submitError: mutation.error,
    isSubmitting: mutation.isPending,
  };
}
