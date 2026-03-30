import { Button } from "@/shared/ui-extended/button";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui-extended/input";
import { InputField } from "@/shared/composite/input-field";
import { TextareaField } from "@/shared/composite/textarea-field";
import {
  FieldContent,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/shared/ui/field";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Image } from "@imagekit/react";
import {
  INQUIRY_CATEGORIES,
  type InquiryCategory,
  useProductSearchForInquiry,
} from "@/entities/inquiry";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

export interface InquiryFormData {
  category: InquiryCategory;
  productId?: number;
  productName?: string;
  productImage?: string;
  title: string;
  content: string;
}

interface InquiryFormProps {
  inquiryId?: string | null;
  initialData?: InquiryFormData;
  onSubmit: (data: InquiryFormData) => void;
  onCancel?: () => void;
  isPending?: boolean;
}

export const InquiryForm = ({
  inquiryId,
  initialData,
  onSubmit,
  onCancel,
  isPending,
}: InquiryFormProps) => {
  const isEditMode = !!inquiryId;
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const form = useForm<InquiryFormData>({
    defaultValues: initialData ?? { category: "일반", title: "", content: "" },
  });

  const [
    category,
    selectedProductId,
    selectedProductName,
    selectedProductImage,
  ] = useWatch({
    control: form.control,
    name: ["category", "productId", "productName", "productImage"],
  });

  const { data: productResults = [] } =
    useProductSearchForInquiry(debouncedQuery);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ category: "일반", title: "", content: "" });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (category !== "상품") {
      form.setValue("productId", undefined, { shouldValidate: true });
      form.setValue("productName", undefined);
      form.setValue("productImage", undefined);
      setSearchQuery("");
    }
  }, [category, form]);

  const handleSelectProduct = (product: {
    id: number;
    name: string;
    image: string;
  }) => {
    form.setValue("productId", product.id, { shouldValidate: true });
    form.setValue("productName", product.name);
    form.setValue("productImage", product.image);
    setSearchQuery("");
  };

  const handleClearProduct = () => {
    form.setValue("productId", undefined, { shouldValidate: true });
    form.setValue("productName", undefined);
    form.setValue("productImage", undefined);
  };

  const handleSubmit = (data: InquiryFormData) => {
    onSubmit(data);
    form.reset({ category: "일반", title: "", content: "" });
    setSearchQuery("");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-2">
          <FieldTitle>문의 유형</FieldTitle>
          <Controller
            name="category"
            control={form.control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {INQUIRY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => field.onChange(cat)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      field.value === cat
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {category === "상품" && (
          <div className="space-y-3 border-t border-stone-200 pt-5">
            <FieldContent>
              <FieldTitle>상품 선택</FieldTitle>
              <FieldDescription>
                상품 문의일 경우 정확한 상품을 선택해 주세요.
              </FieldDescription>
            </FieldContent>

            {selectedProductId && selectedProductName ? (
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
                {selectedProductImage && (
                  <Image
                    src={selectedProductImage}
                    alt={selectedProductName}
                    className="h-12 w-12 rounded-md object-cover"
                    transformation={[{ width: 40, height: 40 }]}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    선택됨
                  </p>
                  <span className="block truncate text-sm text-zinc-800">
                    {selectedProductName}
                  </span>
                </div>
                <button type="button" onClick={handleClearProduct}>
                  <X className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="상품명으로 검색하세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {productResults.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    {productResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="flex w-full items-center gap-3 border-b border-stone-200 px-3 py-3 text-left transition-colors hover:bg-stone-50 last:border-b-0"
                      >
                        <Image
                          src={product.image}
                          alt={product.name}
                          className="h-10 w-10 rounded-md object-cover"
                          transformation={[{ width: 40, height: 40 }]}
                        />
                        <span className="text-sm text-zinc-700">
                          {product.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Controller
              name="productId"
              control={form.control}
              rules={{
                validate: (val) =>
                  category !== "상품" || !!val || "상품을 선택해주세요.",
              }}
              render={({ fieldState }) => (
                <FieldError errors={[fieldState.error]} />
              )}
            />
          </div>
        )}

        <div className="space-y-3 border-t border-stone-200 pt-5">
          <InputField
            control={form.control}
            name="title"
            label="제목"
            placeholder="제목을 입력해주세요."
            rules={{ required: "제목을 입력해주세요." }}
          />
        </div>

        <div className="space-y-3 border-t border-stone-200 pt-5">
          <TextareaField
            control={form.control}
            name="content"
            label="문의 내용"
            description="주문 정보나 원하는 처리 내용을 구체적으로 적어 주세요."
            placeholder="문의 내용을 입력해주세요."
            textareaClassName="min-h-[220px] resize-none"
            rules={{ required: "문의 내용을 입력해주세요." }}
          />
        </div>

        <div className="flex gap-2 border-t border-stone-200 pt-5">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              취소
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "처리 중..." : isEditMode ? "수정하기" : "등록하기"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
