import { Button } from "@/components/ui/button";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  const selectedProductId = useWatch({ control: form.control, name: "productId" });
  const selectedProductName = useWatch({ control: form.control, name: "productName" });
  const selectedProductImage = useWatch({ control: form.control, name: "productImage" });

  const { data: productResults = [] } = useProductSearchForInquiry(debouncedQuery);

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

  const handleSelectProduct = (product: { id: number; name: string; image: string }) => {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

        {/* 카테고리 선택 */}
        <div className="space-y-2 py-2">
          <Label>문의 유형</Label>
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
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      field.value === cat
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* 상품 선택 (category='상품'일 때만) */}
        {category === "상품" && (
          <div className="space-y-2">
            <Label>상품 선택</Label>

            {/* 선택된 상품 칩 */}
            {selectedProductId && selectedProductName ? (
              <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-md border">
                {selectedProductImage && (
                  <Image
                    src={selectedProductImage}
                    alt={selectedProductName}
                    className="w-10 h-10 object-cover rounded"
                    transformation={[{ width: 40, height: 40 }]}
                  />
                )}
                <span className="text-sm flex-1">{selectedProductName}</span>
                <button type="button" onClick={handleClearProduct}>
                  <X className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="상품명으로 검색하세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {productResults.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    {productResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="flex items-center gap-2 w-full p-2 hover:bg-zinc-50 border-b last:border-b-0 text-left"
                      >
                        <Image
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                          transformation={[{ width: 40, height: 40 }]}
                        />
                        <span className="text-sm">{product.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* category='상품'일 때 productId 필수 검증 */}
            <Controller
              name="productId"
              control={form.control}
              rules={{
                validate: (val) =>
                  category !== "상품" || !!val || "상품을 선택해주세요.",
              }}
              render={({ fieldState }) =>
                fieldState.error ? (
                  <p className="text-sm text-red-500">{fieldState.error.message}</p>
                ) : <></>
              }
            />
          </div>
        )}

        {/* 제목 */}
        <div className="space-y-2 py-2">
          <Label>제목</Label>
          <Controller
            name="title"
            control={form.control}
            rules={{ required: "제목을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Input placeholder="제목을 입력해주세요." {...field} className="w-full" />
                {fieldState.error && (
                  <p className="text-sm text-red-500">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        {/* 내용 */}
        <div className="space-y-2">
          <Label>문의 내용</Label>
          <Controller
            name="content"
            control={form.control}
            rules={{ required: "문의 내용을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Textarea
                  placeholder="문의 내용을 입력해주세요."
                  className="min-h-[200px] resize-none"
                  {...field}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
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
