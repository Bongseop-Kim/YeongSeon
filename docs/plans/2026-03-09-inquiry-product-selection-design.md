# 상품 선택 문의 기능 설계

## 개요

1:1 문의 기능에 카테고리 선택 및 상품 연결 기능 추가.
상품 페이지에서 직접 "이 상품 문의하기"로 진입 가능하며, 문의 폼 내에서도 직접 선택 가능.

## 1. DB 변경

`inquiries` 테이블에 컬럼 2개 추가 (신규 마이그레이션):

```sql
ALTER TABLE public.inquiries
  ADD COLUMN category text NOT NULL DEFAULT '일반'
    CONSTRAINT inquiries_category_check
      CHECK (category = ANY (ARRAY['일반','상품','수선','주문제작'])),
  ADD COLUMN product_id integer
    REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_product_category_check
    CHECK (product_id IS NULL OR category = '상품');

CREATE INDEX idx_inquiries_category ON public.inquiries (category);
CREATE INDEX idx_inquiries_product_id ON public.inquiries (product_id);
```

- `category` 기본값 `'일반'` → 기존 데이터 무중단 마이그레이션
- 상품 삭제 시 `ON DELETE SET NULL` → 문의 기록 보존
- `product_id`는 `category = '상품'`일 때만 허용 (DB 레벨 강제)
- RLS 컬럼 권한: `GRANT UPDATE (category, product_id)` 추가 필요

## 2. 타입 & API

### Store 타입

```ts
// inquiry-item.ts
export type InquiryCategory = '일반' | '상품' | '수선' | '주문제작';

export interface InquiryItem {
  id: string;
  date: string;
  status: InquiryStatus;
  category: InquiryCategory;
  product?: { id: string; name: string; thumbnailUrl: string };
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
```

### DTO

- `InquiryRowDTO`에 `category`, `product_id` 추가
- `getInquiries`: `products(id, name, thumbnail_urls)` join

### API 함수

- `createInquiry`: `category`, `productId` 파라미터 추가
- `updateInquiry`: `category`, `productId` 파라미터 추가
- `searchProducts(query: string)`: 상품 검색 (이름 기준, 기본 최근 5개)

### 관리자 타입

- `AdminInquiryListItem`, `AdminInquiryPending`, `AdminInquiryAnswered`에 `category`, `product?` 필드 추가

## 3. 프론트엔드

### inquiry-form.tsx 확장

기존 필드 위에 순서대로 추가:

1. **카테고리 선택** (라디오 버튼 4개)
2. **상품 선택** (`category === '상품'`일 때만 노출)
   - 검색 입력창 (디바운스 300ms)
   - 입력 없을 때: 최근 상품 5개 목록
   - 입력 있을 때: 검색 결과 목록
   - 각 항목: 썸네일 + 상품명
   - 선택 완료 시 칩(chip)으로 표시 + X 버튼으로 해제

`InquiryFormData`에 `category`, `productId`, `productName` 추가.

### 상품 페이지 진입

상품 상세 페이지에 "이 상품 문의하기" 버튼 추가.
클릭 시 쿼리 파라미터로 이동:

```
/my-page/inquiry?category=상품&productId=xxx&productName=xxx
```

문의 페이지 마운트 시 파라미터 읽어 폼 초기값 세팅.

### 관리자 문의 상세

`InquiryDetailSection`에 카테고리 태그 + 상품 링크 행 추가.

## 4. 엣지 케이스

| 상황 | 처리 |
|------|------|
| `category=상품`인데 `productId` 없음 | 폼 제출 차단, "상품을 선택해주세요" 에러 |
| 카테고리를 '상품' 외로 변경 | `productId` 자동 초기화 |
| 상품 삭제로 `product_id = null` | UI에 "상품 정보 없음" 텍스트 (링크 없이) |
| 잘못된 `productId`로 URL 진입 | 상품 선택 초기화, 카테고리만 '상품'으로 세팅 |
| URL `productName` vs 실제 조회 불일치 | 실제 조회 결과 우선 |
