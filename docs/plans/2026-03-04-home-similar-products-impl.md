# Home New Arrivals / Recommended / 유사 상품 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 하드코딩 더미 데이터를 제거하고, Home의 New Arrivals·Recommended 및 Shop 상세의 유사 상품 섹션을 실제 Supabase DB 데이터로 연동한다.

**Architecture:** 기존 `getProducts()` / `useProducts()` API에 `limit` 파라미터를 추가해 재사용. Home 컴포넌트는 `useProducts` 훅으로 데이터를 받고, `ProductCarousel`은 `Product[]` 타입으로 교체. 유사 상품은 `categories` 필터 + 클라이언트 제외 로직.

**Tech Stack:** React, TanStack Query, Supabase JS Client, TypeScript, Vitest

---

### Task 1: `getProducts()` API에 `limit` 파라미터 추가

**Files:**
- Modify: `apps/store/src/features/shop/api/products-api.ts`
- Modify: `apps/store/src/features/shop/api/products-query.ts`

**Step 1: `products-api.ts`의 filters 타입에 `limit` 추가 후 쿼리에 적용**

`getProducts()` 함수 시그니처의 `filters` 객체에 `limit?: number`를 추가하고,
정렬 로직 이후 아래 코드를 삽입한다:

```ts
if (filters?.limit) {
  query = query.limit(filters.limit);
}
```

위치: `const { data, error } = await query;` 바로 앞.

**Step 2: `products-query.ts`의 `useProducts` 훅 타입에 `limit` 추가**

`useProducts(filters?)` 의 `filters` 파라미터 타입에 `limit?: number` 추가.
`queryKey`와 `queryFn` 모두 자동으로 `filters` 객체 전체를 전달하므로 별도 수정 불필요.

**Step 3: 타입 검사 실행**

```bash
pnpm type-check
```

Expected: 에러 없음

**Step 4: Commit**

```bash
git add apps/store/src/features/shop/api/products-api.ts apps/store/src/features/shop/api/products-query.ts
git commit -m "feat(shop): add limit parameter to getProducts and useProducts"
```

---

### Task 2: `ProductCarousel` 컴포넌트를 `Product[]` 타입으로 교체

**Files:**
- Modify: `apps/store/src/features/home/components/product-carousel.tsx`

**Step 1: `ProductItem` import 제거, `Product` import 추가 후 props 타입 변경**

기존:
```tsx
import type { ProductItem } from "@/features/home/types/home";
interface ProductCarouselProps {
  title: string;
  items: ProductItem[];
}
```

변경 후:
```tsx
import type { Product } from "@yeongseon/shared/types/view/product";
interface ProductCarouselProps {
  title: string;
  items: Product[];
}
```

**Step 2: 컴포넌트 내부 렌더링 필드명 수정**

`ProductItem`은 `title`, `price`, `image`, `id` 필드를 사용.
`Product`는 `name`, `price`, `image`, `id` 필드를 사용.

변경:
- `item.title` → `item.name`

나머지(`item.id`, `item.image`, `item.price`)는 동일하므로 그대로 유지.

**Step 3: 타입 검사 실행**

```bash
pnpm type-check
```

Expected: 에러 없음

**Step 4: Commit**

```bash
git add apps/store/src/features/home/components/product-carousel.tsx
git commit -m "feat(home): migrate ProductCarousel to use Product type"
```

---

### Task 3: Home 하드코딩 데이터 제거 및 API 연동

**Files:**
- Modify: `apps/store/src/features/home/components/home-content.tsx`
- Delete: `apps/store/src/features/home/constants/NEW_ARRIVALS_DATA.ts`
- Delete: `apps/store/src/features/home/constants/RECOMMENDED_DATA.ts`

**Step 1: `home-content.tsx` 수정**

기존:
```tsx
import { NEW_ARRIVALS_DATA } from "@/features/home/constants/NEW_ARRIVALS_DATA";
import { RECOMMENDED_DATA } from "@/features/home/constants/RECOMMENDED_DATA";

export const HomeContent = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <Banner />
      <ProductCarousel title="New Arrivals" items={NEW_ARRIVALS_DATA} />
      <ProductCarousel title="Recommended" items={RECOMMENDED_DATA} />
      <BrandVideo />
      <InstagramFeed />
    </div>
  );
};
```

변경 후:
```tsx
import { useProducts } from "@/features/shop/api/products-query";

export const HomeContent = () => {
  const { data: newArrivals = [] } = useProducts({ sortOption: "latest", limit: 8 });
  const { data: recommended = [] } = useProducts({ sortOption: "popular", limit: 8 });

  return (
    <div className="max-w-7xl mx-auto">
      <Banner />
      <ProductCarousel title="New Arrivals" items={newArrivals} />
      <ProductCarousel title="Recommended" items={recommended} />
      <BrandVideo />
      <InstagramFeed />
    </div>
  );
};
```

**Step 2: 더미 상수 파일 삭제**

```bash
rm apps/store/src/features/home/constants/NEW_ARRIVALS_DATA.ts
rm apps/store/src/features/home/constants/RECOMMENDED_DATA.ts
```

**Step 3: `home/types/home.ts`에서 `ProductItem` 타입 제거**

파일 내 `ProductItem` 인터페이스 블록 삭제. `BannerSlide`, `InstagramImage`는 유지.

**Step 4: 타입 검사 실행**

```bash
pnpm type-check
```

Expected: 에러 없음

**Step 5: Commit**

```bash
git add apps/store/src/features/home/components/home-content.tsx apps/store/src/features/home/types/home.ts
git rm apps/store/src/features/home/constants/NEW_ARRIVALS_DATA.ts apps/store/src/features/home/constants/RECOMMENDED_DATA.ts
git commit -m "feat(home): connect New Arrivals and Recommended to real API"
```

---

### Task 4: Shop 상세 페이지 유사 상품 API 연동

**Files:**
- Modify: `apps/store/src/features/shop/detail/page.tsx`

**Step 1: `PRODUCTS_DATA` import 및 `useMemo` 기반 유사 상품 로직 제거**

현재 코드 (약 5~6번째 import 라인):
```tsx
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";
```
→ 이 줄 삭제.

현재 `useMemo` 블록 (약 128~142라인):
```tsx
const similarProducts = useMemo(() => {
  if (!product) return [];
  return PRODUCTS_DATA.filter((p) => {
    if (p.id === product.id) return false;
    return (
      p.category === product.category ||
      p.color === product.color ||
      p.pattern === product.pattern ||
      p.material === product.material
    );
  }).slice(0, isMobile ? 3 : 4);
}, [product, isMobile]);
```
→ 전체 블록 삭제.

**Step 2: `useProducts` 훅으로 교체**

`useProduct(productId)` 훅 호출 바로 아래에 추가:

```tsx
const { data: categoryProducts = [] } = useProducts({
  categories: product ? [product.category] : [],
  limit: isMobile ? 4 : 5,
});

const similarProducts = useMemo(
  () => categoryProducts.filter((p) => p.id !== product?.id).slice(0, isMobile ? 3 : 4),
  [categoryProducts, product?.id, isMobile]
);
```

`useProducts` import 추가 필요:
```tsx
import { useProduct, useProducts } from "@/features/shop/api/products-query";
```
(기존 `useProduct` import를 이 줄로 교체)

**Step 3: 타입 검사 실행**

```bash
pnpm type-check
```

Expected: 에러 없음

**Step 4: Commit**

```bash
git add apps/store/src/features/shop/detail/page.tsx
git commit -m "feat(shop): connect similar products section to real API by category"
```

---

### Task 5: 통합 검증

**Step 1: 개발 서버 실행 후 수동 확인**

```bash
pnpm dev:store
```

확인 항목:
- [ ] Home 페이지 New Arrivals 섹션에 실제 상품이 표시됨
- [ ] Home 페이지 Recommended 섹션에 좋아요 순 상품이 표시됨
- [ ] Shop 상세 페이지에서 같은 카테고리의 다른 상품이 유사 상품으로 표시됨
- [ ] 현재 상품이 유사 상품 목록에 포함되지 않음
- [ ] 콘솔 에러 없음

**Step 2: 타입 검사 + 린트**

```bash
pnpm type-check && pnpm lint
```

Expected: 에러 없음
