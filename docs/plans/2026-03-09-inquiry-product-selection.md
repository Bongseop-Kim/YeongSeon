# 상품 선택 문의 기능 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 1:1 문의에 카테고리(일반/상품/수선/주문제작) 선택 기능을 추가하고, 상품 카테고리 선택 시 특정 상품을 연결할 수 있도록 한다. 상품 상세 페이지에서 "이 상품 문의하기" 버튼으로 직접 진입도 가능.

**Architecture:** `inquiries` 테이블에 `category text`, `product_id integer` 컬럼을 추가한다. Store 앱의 문의 폼에 카테고리 라디오 + 상품 검색/선택 UI를 인라인으로 추가하고, 상품 상세 페이지에서 쿼리 파라미터로 폼 초기값을 세팅한다. 관리자 앱은 문의 상세에 카테고리 및 연결 상품 정보를 표시한다.

**Tech Stack:** Supabase(PostgreSQL), React Hook Form, React Query, Tailwind CSS / shadcn/ui (Store), Ant Design / Refine (Admin)

---

### Task 1: DB 마이그레이션 + 스키마 파일 업데이트

**Files:**
- Create: `supabase/migrations/20260309900000_inquiry_category_and_product.sql`
- Modify: `supabase/schemas/70_inquiries.sql`

**Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260309900000_inquiry_category_and_product.sql

ALTER TABLE public.inquiries
  ADD COLUMN category text NOT NULL DEFAULT '일반'
    CONSTRAINT inquiries_category_check
      CHECK (category = ANY (ARRAY['일반','상품','수선','주문제작'])),
  ADD COLUMN product_id integer
    REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_product_category_check
    CHECK (product_id IS NULL OR category = '상품');

CREATE INDEX idx_inquiries_category   ON public.inquiries (category);
CREATE INDEX idx_inquiries_product_id ON public.inquiries (product_id);

-- category, product_id 컬럼 수정 권한 부여 (사용자: 답변대기 상태에서만 RLS 허용)
GRANT UPDATE (category, product_id) ON TABLE public.inquiries TO authenticated;
```

**Step 2: 스키마 파일 동기화**

`supabase/schemas/70_inquiries.sql`의 `CREATE TABLE` 블록에 아래 컬럼 추가 (기존 `updated_at` 컬럼 뒤에):

```sql
  category    text        NOT NULL DEFAULT '일반',
  product_id  integer,
```

기존 CONSTRAINT 블록 끝에 추가:

```sql
  CONSTRAINT inquiries_category_check
    CHECK (category = ANY (ARRAY['일반','상품','수선','주문제작'])),
  CONSTRAINT inquiries_product_category_check
    CHECK (product_id IS NULL OR category = '상품'),
  CONSTRAINT inquiries_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE SET NULL
```

인덱스 블록 끝에 추가:

```sql
CREATE INDEX idx_inquiries_category   ON public.inquiries USING btree (category);
CREATE INDEX idx_inquiries_product_id ON public.inquiries USING btree (product_id);
```

`GRANT UPDATE` 줄 끝에 추가:

```sql
GRANT UPDATE (category, product_id) ON TABLE public.inquiries TO authenticated;
```

**Step 3: 마이그레이션 적용 확인**

```bash
cd /Users/duegosystem/git/YeongSeon
supabase migration list
```

Remote에 `20260309900000`이 없으면 계속 진행.

```bash
supabase db push
```

성공 시 "Applying migration 20260309900000" 메시지 확인.

**Step 4: 커밋**

```bash
git add supabase/migrations/20260309900000_inquiry_category_and_product.sql
git add supabase/schemas/70_inquiries.sql
git commit -m "feat: inquiries 테이블에 category, product_id 컬럼 추가"
```

---

### Task 2: 공유 DTO 타입 업데이트 (packages/shared)

**Files:**
- Modify: `packages/shared/src/types/dto/admin-inquiry.ts`

**Step 1: `AdminInquiryRowDTO`에 필드 추가**

```ts
export interface AdminInquiryRowDTO {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatusDTO;
  category: string;           // 추가
  product_id: number | null;  // 추가
  answer: string | null;
  answer_date: string | null;
  created_at: string;
}
```

**Step 2: 커밋**

```bash
git add packages/shared/src/types/dto/admin-inquiry.ts
git commit -m "feat: AdminInquiryRowDTO에 category, product_id 필드 추가"
```

---

### Task 3: Store - 타입 및 DTO 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/types/inquiry-item.ts`
- Modify: `apps/store/src/features/my-page/inquiry/types/dto/inquiry.ts`

**Step 1: `inquiry-item.ts` 업데이트**

```ts
export type InquiryStatus = "답변대기" | "답변완료";
export type InquiryCategory = "일반" | "상품" | "수선" | "주문제작";

export const INQUIRY_STATUS = {
  PENDING: "답변대기",
  ANSWERED: "답변완료",
} as const satisfies Record<string, InquiryStatus>;

export const INQUIRY_CATEGORIES: InquiryCategory[] = ["일반", "상품", "수선", "주문제작"];

export interface InquiryProduct {
  id: number;
  name: string;
  image: string;
}

export interface InquiryItem {
  id: string;
  date: string;
  status: InquiryStatus;
  category: InquiryCategory;
  product?: InquiryProduct;   // category='상품'일 때만
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
```

**Step 2: `dto/inquiry.ts` 업데이트**

```ts
export type InquiryStatusDTO = "답변대기" | "답변완료";

export interface InquiryProductDTO {
  id: number;
  name: string;
  image: string;
}

/** inquiries 테이블 row (products join 포함) */
export interface InquiryRowDTO {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatusDTO;
  category: string;
  product_id: number | null;
  products: InquiryProductDTO | null;  // join 결과
  answer: string | null;
  answer_date: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 3: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/types/
git commit -m "feat: InquiryItem, InquiryRowDTO에 category, product 필드 추가"
```

---

### Task 4: Store - API 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/api/inquiry-api.ts`

**Step 1: `inquiry-api.ts` 전체 교체**

```ts
import { supabase } from "@/lib/supabase";
import type { InquiryRowDTO } from "@/features/my-page/inquiry/types/dto/inquiry";
import type { InquiryItem, InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";
import { toInquiryView } from "./inquiry-mapper";

const INQUIRY_SELECT = `
  id, user_id, title, content, status, category, product_id,
  answer, answer_date, created_at, updated_at,
  products(id, name, image)
`;

export const getInquiries = async (): Promise<InquiryItem[]> => {
  const { data, error } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`문의 목록 조회 실패: ${error.message}`);
  const rows = (data as InquiryRowDTO[] | null) ?? [];
  return rows.map(toInquiryView);
};

export const createInquiry = async (params: {
  userId: string;
  category: InquiryCategory;
  productId?: number;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase.from("inquiries").insert({
    user_id: params.userId,
    category: params.category,
    product_id: params.productId ?? null,
    title: params.title,
    content: params.content,
  });
  if (error) throw new Error(`문의 등록 실패: ${error.message}`);
};

export const updateInquiry = async (params: {
  id: string;
  category: InquiryCategory;
  productId?: number;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("inquiries")
    .update({
      category: params.category,
      product_id: params.productId ?? null,
      title: params.title,
      content: params.content,
    })
    .eq("id", params.id);
  if (error) throw new Error(`문의 수정 실패: ${error.message}`);
};

export const deleteInquiry = async (id: string): Promise<void> => {
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(`문의 삭제 실패: ${error.message}`);
};

/** 상품 검색 (문의 폼용) */
export const searchProductsForInquiry = async (
  query: string
): Promise<{ id: number; name: string; image: string }[]> => {
  let req = supabase
    .from("products")
    .select("id, name, image")
    .order("id", { ascending: false })
    .limit(10);

  if (query.trim()) {
    req = req.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await req;
  if (error) throw new Error(`상품 검색 실패: ${error.message}`);
  return (data ?? []) as { id: number; name: string; image: string }[];
};
```

**Step 2: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/api/inquiry-api.ts
git commit -m "feat: inquiry-api에 category/product 지원 및 상품 검색 함수 추가"
```

---

### Task 5: Store - 매퍼 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/api/inquiry-mapper.ts`

**Step 1: `toInquiryView` 업데이트**

```ts
import type { InquiryRowDTO } from "@/features/my-page/inquiry/types/dto/inquiry";
import type { InquiryItem, InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";

export const toInquiryView = (row: InquiryRowDTO): InquiryItem => ({
  id: row.id,
  date: row.created_at.slice(0, 10),
  status: row.status,
  category: (row.category ?? "일반") as InquiryCategory,
  product:
    row.products
      ? { id: row.products.id, name: row.products.name, image: row.products.image }
      : undefined,
  title: row.title,
  content: row.content,
  answer: row.answer ?? undefined,
  answerDate: row.answer_date?.slice(0, 10) ?? undefined,
});
```

**Step 2: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/api/inquiry-mapper.ts
git commit -m "feat: inquiry-mapper에 category, product 매핑 추가"
```

---

### Task 6: Store - 쿼리 훅 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/api/inquiry-query.ts`

**Step 1: `useCreateInquiry`, `useUpdateInquiry` 파라미터 및 `useProductSearchForInquiry` 추가**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  searchProductsForInquiry,
} from "./inquiry-api";
import type { InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";
import { useAuthStore } from "@/store/auth";

export const inquiryKeys = {
  all: ["inquiries"] as const,
  list: (userId?: string) => [...inquiryKeys.all, "list", userId] as const,
  productSearch: (query: string) => ["inquiry-product-search", query] as const,
};

export const useInquiries = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: inquiryKeys.list(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return getInquiries();
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (params: {
      category: InquiryCategory;
      productId?: number;
      title: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return createInquiry({ userId: user.id, ...params });
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

export const useUpdateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (params: {
      id: string;
      category: InquiryCategory;
      productId?: number;
      title: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return updateInquiry(params);
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

export const useDeleteInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return deleteInquiry(id);
    },
    onSuccess: () => {
      if (user?.id) queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

/** 문의 폼 상품 검색 쿼리 */
export const useProductSearchForInquiry = (query: string) =>
  useQuery({
    queryKey: inquiryKeys.productSearch(query),
    queryFn: () => searchProductsForInquiry(query),
    staleTime: 1000 * 30,
  });
```

**Step 2: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/api/inquiry-query.ts
git commit -m "feat: inquiry-query에 category/product 파라미터 및 상품 검색 훅 추가"
```

---

### Task 7: Store - InquiryForm 컴포넌트 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/components/inquiry-form.tsx`

**Step 1: 폼 전체 교체**

카테고리 라디오 + 상품 선택(검색/목록/칩) UI를 추가.

```tsx
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
import { useDebounce } from "@/hooks/use-debounce";  // 기존 훅 사용

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
  const debouncedQuery = useDebounce(searchQuery, 300);

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
                ) : null
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
```

> **주의:** `useDebounce` 훅이 없으면 `apps/store/src/hooks/use-debounce.ts` 파일을 먼저 확인. 없으면 직접 구현:
> ```ts
> import { useState, useEffect } from "react";
> export function useDebounce<T>(value: T, delay: number): T {
>   const [debounced, setDebounced] = useState(value);
>   useEffect(() => {
>     const t = setTimeout(() => setDebounced(value), delay);
>     return () => clearTimeout(t);
>   }, [value, delay]);
>   return debounced;
> }
> ```

**Step 2: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/components/inquiry-form.tsx
git commit -m "feat: 문의 폼에 카테고리 선택 및 상품 검색/선택 UI 추가"
```

---

### Task 8: Store - InquiryCard 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/components/inquiry-card.tsx`

**Step 1: 카테고리 배지 + 상품 정보 표시 추가**

기존 제목 옆 `Badge` 앞에 카테고리 배지를 추가하고, 상품 정보가 있으면 카드에 표시.

`inquiry.title` 줄 위에 카테고리 배지:

```tsx
{inquiry.category !== "일반" && (
  <Badge variant="outline" className="text-xs">{inquiry.category}</Badge>
)}
```

`inquiry.content` 표시 블록 바로 위에 상품 정보:

```tsx
{inquiry.product && (
  <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-md text-sm text-zinc-600">
    <Image
      src={inquiry.product.image}
      alt={inquiry.product.name}
      className="w-8 h-8 object-cover rounded"
      transformation={[{ width: 32, height: 32 }]}
    />
    <span>{inquiry.product.name}</span>
  </div>
)}
```

필요한 import 추가:
```tsx
import { Image } from "@imagekit/react";
```

**Step 2: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/components/inquiry-card.tsx
git commit -m "feat: InquiryCard에 카테고리 배지 및 연결 상품 표시 추가"
```

---

### Task 9: Store - InquiryPage 업데이트

**Files:**
- Modify: `apps/store/src/features/my-page/inquiry/page.tsx`

**Step 1: `InquiryFormData` 타입을 import에 추가**

```tsx
import type { InquiryFormData } from "./components/inquiry-form";
import type { InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";
```

**Step 2: URL 파라미터 읽기**

페이지 상단에 추가 (useBreakpoint 줄 아래):

```tsx
const [searchParams] = useSearchParams();
```

`useEffect`로 초기 파라미터 처리 (컴포넌트 내부):

```tsx
useEffect(() => {
  const category = searchParams.get("category") as InquiryCategory | null;
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");

  if (category) {
    setInitialFormData({
      category,
      productId: productId ? Number(productId) : undefined,
      productName: productName ?? undefined,
      title: "",
      content: "",
    });
    if (isMobile) setIsSheetOpen(true);
  }
}, []); // 마운트 시 1회
```

`useState`로 initialFormData 상태 추가:

```tsx
const [initialFormData, setInitialFormData] = useState<InquiryFormData | undefined>(undefined);
```

**Step 3: `handleFormSubmit` 시그니처 변경**

```tsx
const handleFormSubmit = useCallback(
  (data: InquiryFormData) => {
    if (editingInquiryId) {
      updateMutation.mutate(
        {
          id: editingInquiryId,
          category: data.category,
          productId: data.productId,
          title: data.title,
          content: data.content,
        },
        { ... }
      );
    } else {
      createMutation.mutate(
        {
          category: data.category,
          productId: data.productId,
          title: data.title,
          content: data.content,
        },
        { ... }
      );
    }
  },
  [editingInquiryId, updateMutation, createMutation],
);
```

**Step 4: `initialData` useMemo 업데이트**

```tsx
const initialData = useMemo<InquiryFormData | undefined>(() => {
  if (editingInquiry) {
    return {
      category: editingInquiry.category,
      productId: editingInquiry.product?.id,
      productName: editingInquiry.product?.name,
      productImage: editingInquiry.product?.image,
      title: editingInquiry.title,
      content: editingInquiry.content,
    };
  }
  return initialFormData;
}, [editingInquiry, initialFormData]);
```

**Step 5: import에 `useSearchParams` 추가**

```tsx
import { useSearchParams } from "react-router-dom";
```

**Step 6: 커밋**

```bash
git add apps/store/src/features/my-page/inquiry/page.tsx
git commit -m "feat: 문의 페이지에 URL 파라미터 기반 초기값 세팅 추가"
```

---

### Task 10: Store - 상품 상세 페이지 "이 상품 문의하기" 버튼

**Files:**
- Modify: `apps/store/src/features/shop/detail/components/product-action-buttons.tsx`
- Modify: `apps/store/src/features/shop/detail/page.tsx`

**Step 1: `ProductActionButtons`에 `onInquiry` prop 추가**

```tsx
interface ProductActionButtonsProps {
  likes: number;
  isLiked: boolean;
  onLikeToggle: () => void;
  onAddToCart: () => void;
  onOrder: () => void;
  onInquiry: () => void;  // 추가
  disabled?: boolean;
}
```

모바일 버튼 블록 끝에 추가:

```tsx
<Button type="button" variant="ghost" size="sm" onClick={onInquiry} className="text-xs text-zinc-500">
  이 상품 문의하기
</Button>
```

데스크톱 버튼 블록 끝에 추가 (동일):

```tsx
<Button type="button" variant="ghost" size="sm" onClick={onInquiry} className="text-xs text-zinc-500">
  이 상품 문의하기
</Button>
```

**Step 2: `ShopDetailPage`에 `handleInquiry` 핸들러 추가**

```tsx
const handleInquiry = () => {
  if (!product) return;
  const params = new URLSearchParams({
    category: "상품",
    productId: String(product.id),
    productName: product.name,
  });
  navigate(`${ROUTES.MY_PAGE_INQUIRY}?${params.toString()}`);
};
```

`ProductActionButtons`에 prop 전달:

```tsx
<ProductActionButtons
  ...
  onInquiry={handleInquiry}
/>
```

**Step 3: 커밋**

```bash
git add apps/store/src/features/shop/detail/components/product-action-buttons.tsx
git add apps/store/src/features/shop/detail/page.tsx
git commit -m "feat: 상품 상세 페이지에 '이 상품 문의하기' 버튼 추가"
```

---

### Task 11: Admin - 타입 및 매퍼 업데이트

**Files:**
- Modify: `apps/admin/src/features/inquiries/types/admin-inquiry.ts`
- Modify: `apps/admin/src/features/inquiries/api/inquiries-mapper.ts`

**Step 1: `admin-inquiry.ts` 업데이트**

`AdminInquiryBase`에 필드 추가:

```ts
export type InquiryCategory = "일반" | "상품" | "수선" | "주문제작";

interface AdminInquiryBase {
  id: string;
  title: string;
  content: string;
  date: string;
  category: InquiryCategory;
  product?: { id: number; name: string };
}
```

`AdminInquiryListItem`에 `category` 추가:

```ts
export interface AdminInquiryListItem {
  id: string;
  title: string;
  status: InquiryStatus;
  category: InquiryCategory;
  date: string;
}
```

**Step 2: `inquiries-mapper.ts` 업데이트**

`toAdminInquiryListItem`:

```ts
export function toAdminInquiryListItem(dto: AdminInquiryRowDTO): AdminInquiryListItem {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    category: (dto.category ?? "일반") as InquiryCategory,
    date: formatDate(dto.created_at),
  };
}
```

`toAdminInquiryDetail` (product 필드 추가):

```ts
export function toAdminInquiryDetail(dto: AdminInquiryRowDTO): AdminInquiryDetail {
  const base = {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    date: formatDate(dto.created_at),
    category: (dto.category ?? "일반") as InquiryCategory,
    product: dto.product_id
      ? { id: dto.product_id, name: (dto as any).products?.name ?? "" }
      : undefined,
  };

  if (dto.status === "답변완료" && dto.answer && dto.answer_date) {
    return { type: "answered", status: dto.status, answer: dto.answer, answerDate: formatDate(dto.answer_date), ...base };
  }
  return { type: "pending", status: "답변대기", ...base };
}
```

> **참고:** Refine의 `useShow`는 `meta.select`를 통해 join을 설정해야 product 데이터가 포함됨. `inquiries-query.ts`의 `useAdminInquiryDetail`에 아래 옵션 추가:
> ```ts
> const { query } = useShow<AdminInquiryRowDTO>({
>   resource: "inquiries",
>   meta: { select: "*, products(id, name)" },
> });
> ```

**Step 3: 커밋**

```bash
git add apps/admin/src/features/inquiries/types/admin-inquiry.ts
git add apps/admin/src/features/inquiries/api/inquiries-mapper.ts
git add apps/admin/src/features/inquiries/api/inquiries-query.ts
git commit -m "feat: admin 문의 타입/매퍼에 category, product 필드 추가"
```

---

### Task 12: Admin - 문의 상세 UI 업데이트

**Files:**
- Modify: `apps/admin/src/features/inquiries/components/inquiry-detail-section.tsx`
- Modify: `apps/admin/src/features/inquiries/components/inquiry-list-table.tsx`

**Step 1: `inquiry-detail-section.tsx`에 카테고리 + 상품 행 추가**

기존 `Descriptions.Item label="제목"` 바로 아래에 추가:

```tsx
<Descriptions.Item label="문의 유형">
  <Tag>{detail.category}</Tag>
</Descriptions.Item>
{detail.product && (
  <Descriptions.Item label="연결 상품">
    {detail.product.name || "(상품 정보 없음)"}
  </Descriptions.Item>
)}
```

**Step 2: `inquiry-list-table.tsx`에 카테고리 컬럼 추가**

기존 테이블 컬럼 중 `title` 컬럼 앞에:

```tsx
{
  title: "유형",
  dataIndex: "category",
  key: "category",
  width: 80,
  render: (category: string) => <Tag>{category}</Tag>,
},
```

**Step 3: 커밋**

```bash
git add apps/admin/src/features/inquiries/components/
git commit -m "feat: admin 문의 상세/목록에 카테고리 및 연결 상품 표시"
```

---

## 동작 확인 체크리스트

- [ ] 문의 폼에서 카테고리 4가지 선택 가능
- [ ] 카테고리 '상품' 선택 시 상품 검색창 노출
- [ ] 검색어 없을 때 최근 상품 목록 표시
- [ ] 검색어 입력 시 필터링된 목록 표시 (디바운스 300ms)
- [ ] 상품 선택 시 칩으로 표시, X 버튼으로 해제
- [ ] 카테고리를 '상품' 외로 변경 시 상품 선택 초기화
- [ ] 카테고리 '상품' + 상품 미선택 상태로 등록 시 에러 표시
- [ ] 상품 상세 페이지 "이 상품 문의하기" 클릭 시 문의 페이지로 이동 + 상품 자동 선택
- [ ] 문의 카드에 카테고리 배지 표시 (일반 제외)
- [ ] 문의 카드에 연결 상품 정보 표시
- [ ] 관리자 문의 목록에 카테고리 컬럼 표시
- [ ] 관리자 문의 상세에 카테고리 + 연결 상품 행 표시
- [ ] 기존 문의 데이터 (category='일반') 정상 표시
