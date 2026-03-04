# Home New Arrivals / Recommended / Shop 유사 상품 설계

**날짜**: 2026-03-04
**브랜치**: refactor/todo

## 현재 상태

| 섹션 | 현재 구현 | 문제 |
|------|-----------|------|
| Home - New Arrivals | `NEW_ARRIVALS_DATA` 하드코딩 (더미 20개) | 실제 DB 연동 없음 |
| Home - Recommended | `RECOMMENDED_DATA` 하드코딩 (동일 더미 20개) | 실제 DB 연동 없음 |
| Shop Detail - 유사한 상품 | `PRODUCTS_DATA` + `useMemo` 클라이언트 필터 | TODO 주석, 하드코딩 의존 |

## 결정된 기준

- **New Arrivals**: `created_at` 최신 8개
- **Recommended**: `likes` 상위 8개
- **유사한 상품**: 같은 `category`, 현재 상품 제외, 최대 3~4개

## 선택 접근: 기존 API 재사용 + `limit` 추가 (A안)

기존 `getProducts()` / `useProducts()`에 `limit?: number` 파라미터 추가.
별도 RPC나 신규 API 함수 없이 기존 view(`product_list_view`) + sort + limit으로 처리.

## 데이터 흐름

```text
product_list_view (Supabase)
  └── getProducts({ sortOption: 'latest', limit: 8 })       → Home New Arrivals
  └── getProducts({ sortOption: 'popular', limit: 8 })       → Home Recommended
  └── getProducts({ categories: [category], limit: 5 })      → Similar Products
                                                               (클라이언트에서 현재 상품 제외 후 3~4개)
```

## 변경 파일 목록

### 수정
1. `apps/store/src/features/shop/api/products-api.ts` — `limit` 파라미터 추가
2. `apps/store/src/features/shop/api/products-query.ts` — `useProducts` 훅에 `limit` 전달
3. `apps/store/src/features/home/components/home-content.tsx` — 하드코딩 상수 제거, `useProducts` 훅 사용
4. `apps/store/src/features/home/components/product-carousel.tsx` — `ProductItem[]` → `Product[]` 타입 교체, `ProductCard` 렌더링으로 교체
5. `apps/store/src/features/shop/detail/page.tsx` — `useMemo + PRODUCTS_DATA` 제거, `useProducts` 훅 사용

### 삭제
6. `apps/store/src/features/home/constants/NEW_ARRIVALS_DATA.ts`
7. `apps/store/src/features/home/constants/RECOMMENDED_DATA.ts`
8. `apps/store/src/features/home/types/home.ts`의 `ProductItem` 타입 (BannerSlide, InstagramImage는 유지)

### 유지
- `apps/store/src/features/shop/constants/PRODUCTS_DATA.ts` — cart-content.tsx에서 별도 사용 중, 이번 범위 외

## 유사 상품 쿼리 전략

`product`가 로드된 후에만 쿼리 실행 (`enabled: !!product`).
같은 카테고리 최대 5개 fetch → 클라이언트에서 현재 상품 `id` 제외 → `slice(0, isMobile ? 3 : 4)`.

## 타입 변경

`home/types/home.ts`의 `ProductItem`은 `@yeongseon/shared`의 `Product` 타입으로 대체.
`ProductCarousel` 컴포넌트의 `items` prop 타입을 `Product[]`로 교체.
