import { Button } from "@/components/ui-extended/button";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui-extended/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Image } from "@imagekit/react";
import {
  INQUIRY_CATEGORIES,
  type InquiryCategory,
} from "@/features/my-page/inquiry/types/inquiry-item";
import { useProductSearchForInquiry } from "@/features/my-page/inquiry/api/inquiry-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

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

  const category = useWatch({ control: form.control, name: "category" });
  const selectedProductId = useWatch({
    control: form.control,
    name: "productId",
  });
  const selectedProductName = useWatch({
    control: form.control,
    name: "productName",
  });
  const selectedProductImage = useWatch({
    control: form.control,
    name: "productImage",
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

  // 카테고리가 '상품'이 아닌 경우 상품 선택 초기화
  useEffect(() => {
    if (category !== "상품") {
      form.setValue("productId", undefined);
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
    form.setValue("productId", product.id);
    form.setValue("productName", product.name);
    form.setValue("productImage", product.image);
    setSearchQuery("");
  };

  const handleClearProduct = () => {
    form.setValue("productId", undefined);
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Category
            </p>
            <Label className="mt-2 block">문의 유형</Label>
          </div>
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Product
              </p>
              <Label className="mt-2 block">상품 선택</Label>
              <p className="mt-1 text-sm text-zinc-500">
                상품 문의일 경우 정확한 상품을 선택해 주세요.
              </p>
            </div>

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
              render={({ fieldState }) =>
                fieldState.error ? (
                  <p className="text-sm text-red-500">
                    {fieldState.error.message}
                  </p>
                ) : (
                  <></>
                )
              }
            />
          </div>
        )}

        <div className="space-y-3 border-t border-stone-200 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Subject
            </p>
            <Label className="mt-2 block">제목</Label>
          </div>
          <Controller
            name="title"
            control={form.control}
            rules={{ required: "제목을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Input
                  placeholder="제목을 입력해주세요."
                  {...field}
                  className="w-full"
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-3 border-t border-stone-200 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Message
            </p>
            <Label className="mt-2 block">문의 내용</Label>
            <p className="mt-1 text-sm text-zinc-500">
              주문 정보나 원하는 처리 내용을 구체적으로 적어 주세요.
            </p>
          </div>
          <Controller
            name="content"
            control={form.control}
            rules={{ required: "문의 내용을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Textarea
                  placeholder="문의 내용을 입력해주세요."
                  className="min-h-[220px] resize-none"
                  {...field}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
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
