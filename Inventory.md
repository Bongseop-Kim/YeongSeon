# Project Inventory — ESSE SION

> 생성일: 2026-02-19
> 스택: React 19 · React Router DOM v7 · Zustand v5 · TanStack Query v5 · Supabase · Vite · Tailwind CSS v4
> 근거: 실제 소스 코드 정적 분석 결과만 기록. 추측 없음.

---

## 1. 구현된 기능 / 화면 목록

| # | 화면명 | 라우트 | 파일 경로 | 핵심 책임 | 인증 필요 |
|---|--------|--------|-----------|-----------|-----------|
| 1 | 홈 | `/` | `src/features/home/page.tsx` | 배너, 신상품, 추천, 인스타그램 피드 렌더링 (정적 데이터) | ✗ |
| 2 | 로그인 | `/login` | `src/features/auth/login/page.tsx` | Kakao / Google OAuth 진입점 | ✗ |
| 3 | OAuth 콜백 | `/auth/callback` | `src/features/auth/callback/page.tsx` | Supabase 세션 수신 → `sessionStorage.authRedirect` 복원 | ✗ |
| 4 | 상점 | `/shop` | `src/features/shop/page.tsx` | 상품 목록 조회, 카테고리/색상/패턴/소재/가격 필터, 정렬 | ✗ |
| 5 | 상품 상세 | `/shop/:id` | `src/features/shop/detail/page.tsx` | 단일 상품 조회, 옵션 선택, 장바구니 추가, 좋아요 | ✗ |
| 6 | 디자인 도구 | `/design` | `src/features/design/page.tsx` | 넥타이 디자인 옵션 선택, 프리뷰 렌더링 (서버 미사용) | ✗ |
| 7 | 주문 제작 | `/custom-order` | `src/features/custom-order/page.tsx` | 커스텀 주문 폼 (원단/라벨/수량 등), 비용 계산 (서버 미사용) | ✗ |
| 8 | 수선 (Reform) | `/reform` | `src/features/reform/page.tsx` | 넥타이 수선 요청 폼, 장바구니 연동 | ✗ |
| 9 | 장바구니 | `/cart` | `src/features/cart/page.tsx` | 상품/수선 아이템 목록, 수량/옵션 변경, 쿠폰 적용, 주문 진입 | ✗ |
| 10 | 주문서 | `/order/order-form` | `src/features/order/order-form/page.tsx` | 배송지 선택, 쿠폰 적용, 총액 계산, 주문 생성 | ✓ |
| 11 | 주문 목록 | `/order/order-list` | `src/features/order/order-list/page.tsx` | 주문 내역 조회, 날짜/키워드 검색 | ✓ |
| 12 | 주문 상세 | `/order/:id` | `src/features/order/[id]/page.tsx` | 단일 주문 상세, 배송 상태 표시 | ✓ |
| 13 | 취소/반품 목록 | `/order/claim-list` | `src/features/order/claim-list/page.tsx` | 클레임 내역 조회 | ✓ |
| 14 | 취소/반품 신청 | `/order/claim/:type/:orderId/:itemId` | `src/features/order/claim/[type]/[orderId]/[itemId]/page.tsx` | 취소·반품 신청 폼 | ✓ |
| 15 | 배송지 관리 | `/shipping` | `src/features/shipping/page.tsx` | 배송지 목록, 기본 배송지 지정, 삭제 | ✓ |
| 16 | 배송지 추가/수정 | `/shipping/form` | `src/features/shipping/form/page.tsx` | 주소 폼 (Daum 우편번호 검색 포함) | ✓ |
| 17 | 마이페이지 | `/my-page` | `src/features/my-page/page.tsx` | 주문/배송/내 정보/문의 진입 메뉴 | ✓ |
| 18 | 내 정보 | `/my-page/my-info` | `src/features/my-page/my-info/page.tsx` | 프로필 요약 | ✓ |
| 19 | 개인정보 수정 | `/my-page/my-info/detail` | `src/features/my-page/my-info/detail/page.tsx` | 이름·전화·생년월일 수정 | ✓ |
| 20 | 이메일 변경 | `/my-page/my-info/email` | `src/features/my-page/my-info/email/page.tsx` | 이메일 변경 폼 | ✓ |
| 21 | 마케팅 수신 동의 | `/my-page/my-info/notice` | `src/features/my-page/my-info/notice/page.tsx` | 수신 동의 토글 | ✓ |
| 22 | 회원 탈퇴 | `/my-page/my-info/leave` | `src/features/my-page/my-info/leave/page.tsx` | 탈퇴 확인 및 처리 | ✓ |
| 23 | 문의하기 | `/my-page/inquiry` | `src/features/my-page/inquiry/page.tsx` | 문의 폼 제출 | ✓ |
| 24 | FAQ | `/faq` | `src/features/faq/page.tsx` | 정적 FAQ 목록 (상수 기반) | ✗ |
| 25 | 공지사항 | `/notice` | `src/features/notice/page.tsx` | 정적 공지 목록 (상수 기반) | ✗ |
| 26 | 개인정보처리방침 | `/privacy-policy` | `src/features/privacy-policy/page.tsx` | 정적 정책 문서 (팝업으로도 노출) | ✗ |
| 27 | 이용약관 | `/terms-of-service` | `src/features/terms-of-service/page.tsx` | 정적 약관 문서 | ✗ |
| 28 | 환불정책 | `/refund-policy` | `src/features/refund-policy/page.tsx` | 정적 환불 문서 | ✗ |

---

## 2. 데이터 소스 접근 지점

### 2-1. Supabase 클라이언트 싱글턴

| 파일 | 역할 | 비고 |
|------|------|------|
| `src/lib/supabase.ts` | `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` | 모든 API 파일에서 import |

---

### 2-2. 인증 (`features/auth/api/`)

| 파일 | Supabase 호출 | 반환 |
|------|---------------|------|
| `auth.api.ts` | `supabase.auth.getSession()` | `Session \| null` |
| `auth.api.ts` | `supabase.auth.onAuthStateChange(callback)` | 구독 해제 함수 |
| `auth.api.ts` | `supabase.auth.signInWithOAuth({ provider })` | `void` |
| `auth.api.ts` | `supabase.auth.signOut()` | `void` |
| `auth.query.ts` | React Query 훅: `useSession`, `useSignIn`, `useSignOut` | — |

---

### 2-3. 상품 (`features/shop/api/`)

| 파일 | DB 접근 | 비고 |
|------|---------|------|
| `products-api.ts` | `supabase.from("product_list_view").select("*")` + 필터/정렬 체이닝 | `getProducts(filters)` |
| `products-api.ts` | `supabase.from("product_list_view").select("*").eq("id", id).maybeSingle()` | `getProductById(id)` |
| `products-api.ts` | `supabase.from("product_list_view").select("*").in("id", ids)` | `getProductsByIds(ids)` |
| `products-mapper.ts` | `ProductDTO → Product` 변환 | DTO / View 분리 |
| `products-query.ts` | `useProducts(filters)`, `useProduct(id)` | TanStack Query |
| `likes-api.ts` | `supabase.from("product_likes").insert / .delete` | `addLike / removeLike` |
| `likes-query.ts` | `useLike`, `useUnlike` | 뮤테이션 |
| `product-service.ts` | `getProductsByIds` 래퍼 — cart-api에서 호출 | 내부 서비스 레이어 |

---

### 2-4. 장바구니 (`features/cart/api/`)

| 파일 | DB 접근 | 비고 |
|------|---------|------|
| `cart-api.ts` | `supabase.rpc("get_cart_items", { p_user_id, p_active_only })` | `getCartItems(userId)` |
| `cart-api.ts` | `supabase.rpc("replace_cart_items", { p_user_id, p_items })` | `setCartItems(userId, items)` (트랜잭션) |
| `cart-api.ts` | `supabase.from("cart_items").delete().eq("user_id", userId)` | `clearCartItems(userId)` |
| `cart-mapper.ts` | `CartItemViewDTO ↔ CartItem` 변환 | |
| `cart-query.ts` | `useCartItems`, `useSetCartItems`, `useClearCartItems` | |

**비로그인 경로**: `features/cart/utils/cart-local-storage.ts` → localStorage (`guest-cart` 키)

---

### 2-5. 주문 (`features/order/api/`)

| 파일 | DB / 외부 접근 | 비고 |
|------|----------------|------|
| `order-api.ts` | `supabase.functions.invoke("create-order", { body })` | Edge Function 호출 |
| `order-api.ts` | `supabase.from("order_list_view").select("*").order(...)` | `getOrders()` |
| `order-api.ts` | `supabase.from("order_item_view").select("*").in("order_id", ids)` | 주문 아이템 일괄 조회 |
| `order-api.ts` | `supabase.from("order_list_view").eq("id", id).maybeSingle()` | `getOrder(orderId)` |
| `order-mapper.ts` | `OrderListRowDTO / OrderItemRowDTO → Order` 변환 | |
| `order-query.ts` | `useOrders`, `useOrder(id)`, `useCreateOrder` | |

---

### 2-6. 쿠폰 (`features/order/api/`)

| 파일 | DB 접근 | 비고 |
|------|---------|------|
| `coupons-api.ts` | `supabase.from("user_coupons").select("*, coupons(*)")` | `getUserCoupons()` |
| `coupons-api.ts` | `.in("id", ids)` + `.eq("is_used", false)` 조건 | `getUserCouponsByIds(ids)` |
| `coupons-query.ts` | `useUserCoupons` | |

---

### 2-7. 배송지 (`features/shipping/api/`)

| 파일 | DB 접근 | 비고 |
|------|---------|------|
| `shipping-api.ts` | `supabase.from("shipping_addresses").select("*")` | `getShippingAddresses()` |
| `shipping-api.ts` | `.eq("is_default", true).maybeSingle()` | `getDefaultShippingAddress()` |
| `shipping-api.ts` | `.insert(data).select().single()` | `createShippingAddress()` |
| `shipping-api.ts` | `.update(data).eq("id", id)` | `updateShippingAddress()` |
| `shipping-api.ts` | `.delete().eq("id", id)` | `deleteShippingAddress()` |
| `shipping-query.ts` | `useShippingAddresses`, `useDefaultShippingAddress`, `useShippingAddress(id)`, `useCreateShippingAddress`, `useUpdateShippingAddress`, `useDeleteShippingAddress` | |

---

### 2-8. 프로필 (`features/my-page/api/`)

| 파일 | DB 접근 | 비고 |
|------|---------|------|
| `profile-api.ts` | `supabase.from("profiles").select("*").eq("id", user.id)` | `getProfile()` |
| `profile-api.ts` | `.update({ name, phone, birth })` | `updateProfile(data)` |
| `profile-query.ts` | `useProfile`, `useUpdateProfile` | |

---

### 2-9. 이미지 CDN

| 라이브러리 | 설정 파일 | 용도 |
|-----------|-----------|------|
| `@imagekit/react` | `src/lib/imagekit.ts` | `VITE_IMAGEKIT_URL_ENDPOINT` 환경변수 사용. `ImageKitProvider`로 전역 제공 |

---

## 3. 상태 관리 사용 지점

### 3-1. Zustand (전역 클라이언트 상태)

| 스토어 | 파일 | 상태 인터페이스 | 사용 위치 |
|--------|------|-----------------|-----------|
| `useAuthStore` | `src/store/auth.ts` | `{ user: User \| null, initialized: boolean }` | `AuthSyncProvider` (쓰기), `AppLayout` / `useCart` / `ProtectedRoute` (읽기) |
| `useModalStore` | `src/store/modal.ts` | `{ isOpen, modalType, title, description, children, confirmText, cancelText, confirmVariant, customFooter, showDefaultFooter, fullScreenOnMobile, onConfirm, onCancel }` + `openModal / closeModal / confirm` | `useCart` (장바구니 추가 확인), 각 페이지의 삭제/확인 다이얼로그 |
| `useOrderStore` | `src/store/order.ts` | `{ items: CartItem[] }` + `persist` 미들웨어 → localStorage `"order-storage"` | `CartPage` (주문 아이템 적재), `OrderFormPage` (읽기 + 쿠폰 업데이트) |
| `useSearchStore` | `src/store/search.ts` | `{ config: { enabled, placeholder, query, dateFilter }, isSheetOpen }` | `AppLayout` (SearchBar 표시 여부), `OrderListPage` (검색 활성화) |

---

### 3-2. TanStack Query (서버 상태 캐시)

**설정**: `src/lib/query-client.ts` — `staleTime: 5분`, `refetchOnWindowFocus: false`, `retry: 1`

| 쿼리 키 | 패밀리 | 관련 API | 데이터 소스 |
|---------|--------|----------|-------------|
| `authKeys.session()` | auth | `getSession` | `supabase.auth` |
| `productKeys.list(filters)` | shop | `getProducts` | `product_list_view` |
| `productKeys.detail(id)` | shop | `getProductById` | `product_list_view` |
| `cartKeys.items(userId)` | cart | `getCartItems` | RPC `get_cart_items` |
| `cartKeys.guest()` | cart | `getGuestItems` | localStorage |
| `orderKeys.list` | order | `getOrders` | `order_list_view` + `order_item_view` |
| `orderKeys.detail(id)` | order | `getOrder` | `order_list_view` + `order_item_view` |
| `userCouponKeys.list` | coupon | `getUserCoupons` | `user_coupons` |
| `shippingKeys.list` | shipping | `getShippingAddresses` | `shipping_addresses` |
| `shippingKeys.default` | shipping | `getDefaultShippingAddress` | `shipping_addresses` |
| `shippingKeys.detail(id)` | shipping | `getShippingAddressById` | `shipping_addresses` |
| `profileKeys.detail` | my-page | `getProfile` | `profiles` |

---

### 3-3. localStorage (영속 로컬 상태)

| 키 | 관리 파일 | 저장 내용 |
|----|-----------|-----------|
| `guest-cart` | `features/cart/utils/cart-local-storage.ts` | 비로그인 장바구니 아이템 |
| `user-cart-cache-{userId}` | `cart-local-storage.ts` | 로그인 사용자 캐시 (서버 동기화 전 임시) |
| `order-storage` | `store/order.ts` (Zustand persist) | 주문서 진입 시 선택된 장바구니 아이템 |

---

### 3-4. sessionStorage

| 키 | 관리 위치 | 저장 내용 |
|----|-----------|-----------|
| `authRedirect` | `ProtectedRoute` / `auth/callback/page.tsx` | 로그인 전 접근하려던 경로 (로그인 후 복원) |

---

### 3-5. React 로컬 상태 (useCart 내부 패턴)

`features/cart/hooks/useCart.ts`의 `syncItems` 함수가 **낙관적 업데이트** 패턴으로 동작:
1. `queryClient.setQueryData(...)` → 즉시 UI 반영
2. 서버 뮤테이션 성공 → 유지
3. 서버 뮤테이션 실패 → `queryClient.setQueryData(...)` 이전 값으로 롤백

---

## 4. 네비게이션 / 라우팅 맵

### 4-1. 라우터 설정

| 파일 | 역할 |
|------|------|
| `src/routes/index.tsx` | 모든 `<Route>` 정의. `<ProtectedRoute>` 래핑 |
| `src/App.tsx` | `<BrowserRouter>` 루트 + `<Providers>` 감쌈 |
| `src/components/layout/app-layout.tsx` | 헤더/푸터 + `<Router />` 렌더 |
| `src/constants/ROUTES.ts` | 모든 경로 문자열 상수 (`as const`) |
| `src/constants/ROUTE_TITLES.ts` | 경로 → 모바일 헤더 타이틀 매핑 |
| `src/constants/NAVIGATION_ITEMS.ts` | 헤더 nav 링크 목록 |

### 4-2. 공개 라우트 (인증 불필요)

```
/                    → HomePage
/login               → LoginPage
/auth/callback       → AuthCallbackPage
/shop                → ShopPage
/shop/:id            → ShopDetailPage
/design              → DesignPage
/custom-order        → OrderPage (커스텀 주문)
/reform              → ReformPage
/cart                → CartPage
/faq                 → FaqPage
/notice              → NoticePage
/privacy-policy      → PrivacyPolicyPage
/terms-of-service    → TermsOfServicePage
/refund-policy       → RefundPolicyPage
*                    → Navigate("/", replace)
```

### 4-3. 보호 라우트 (`<ProtectedRoute>` 래핑)

```
/order/order-form                          → OrderFormPage
/order/order-list                          → OrderListPage
/order/:id                                 → OrderDetailPage
/order/claim-list                          → ClaimListPage
/order/claim/:type/:orderId/:itemId        → ClaimFormPage
/shipping                                  → ShippingPage
/shipping/form                             → ShippingFormPage
/my-page                                   → MypagePage
/my-page/my-info                           → MyInfoPage
/my-page/my-info/detail                    → MyInfoDetailPage
/my-page/my-info/email                     → MyInfoEmailPage
/my-page/my-info/notice                    → MyInfoNoticePage
/my-page/my-info/leave                     → MyInfoLeavePage
/my-page/inquiry                           → InquiryPage
```

**ProtectedRoute 동작** (`src/components/composite/protected-route.tsx`):
- `useAuthStore().initialized === false` → 로딩 상태 대기
- `useAuthStore().user === null` → `sessionStorage.authRedirect = location.pathname` 후 `/login` 리다이렉트
- 로그인 성공 → `AuthCallbackPage`에서 저장된 경로로 복원

### 4-4. 주요 내부 네비게이션 흐름

```
CartPage
  → [주문하기] → useOrderStore.setOrderItems() → navigate("/order/order-form")

OrderFormPage
  → [주문 완료] → useCreateOrder() → clearCart() → navigate("/order/order-list")

ShopDetailPage
  → [장바구니 추가] → useCart().addToCart() → Modal 확인 → navigate("/cart")

LoginPage
  → [OAuth] → signInWithOAuth() → Supabase redirect → /auth/callback → 원래 경로

AppLayout (Footer/Header)
  → 정책 링크 → openPopup() (팝업 창으로 열기)
```

---

## 5. 공통 컴포넌트 / 디자인 시스템 레이어 구조

### 5-1. Provider 래핑 계층 (`src/providers/index.tsx`)

```
<QueryProvider>                   // TanStack Query 초기화
  <AuthSyncProvider>              // Supabase auth ↔ Zustand/Query 동기화
    <CartSyncProvider>            // 로그인/로그아웃 시 장바구니 병합
      <BreakpointProvider>        // isMobile 컨텍스트 (window.matchMedia)
        <ImageKitProvider>        // CDN URL endpoint 주입
          <ScrollToTop />         // 라우트 변경 시 scrollTo(0,0)
          {children}
          <GlobalModal />         // useModalStore 구독 전역 모달
          <Toaster />             // Sonner 토스트
        </ImageKitProvider>
      </BreakpointProvider>
    </CartSyncProvider>
  </AuthSyncProvider>
</QueryProvider>
```

| Provider | 파일 | 핵심 책임 | 호출 관계 |
|----------|------|-----------|-----------|
| `QueryProvider` | `providers/query-provider.tsx` | `QueryClientProvider` 래핑 | `lib/query-client.ts` |
| `AuthSyncProvider` | `providers/auth-sync-provider.tsx` | `supabase.auth.getSession()` 초기화 + `onAuthStateChange` 구독 → `useAuthStore.setState` + `queryClient.setQueryData(authKeys.session())` | `store/auth.ts`, `features/auth/api/auth.query.ts` |
| `CartSyncProvider` | `providers/cart-sync-provider.tsx` | `userId` 변화 감지 → 게스트 장바구니 서버 업로드 / 서버 장바구니 로컬 전환 | `features/cart/hooks/useCartAuthSync.ts` |
| `BreakpointProvider` | `providers/breakpoint-provider.tsx` | `useBreakpoint()` 훅 제공 (`isMobile`) | `app-layout.tsx` 등 |

---

### 5-2. 레이아웃 컴포넌트 (`src/components/layout/`)

| 컴포넌트 | 파일 | 핵심 책임 | 호출 관계 |
|----------|------|-----------|-----------|
| `AppLayout` | `app-layout.tsx` | 헤더(뒤로가기/네비/장바구니 카운트/로그인 버튼) + `<Router>` + 푸터 | `Router`, `useCart`, `useAuthStore`, `useSearchStore`, `useBreakpoint` |
| `MainLayout` | `main-layout.tsx` | 페이지 최대 너비, 좌우 패딩, 스크롤 영역 | 각 Page 컴포넌트 |
| `TwoPanelLayout` | `two-panel-layout.tsx` | 모바일(단일 컬럼) / 데스크톱(좌·우 패널) 전환 | `ShopPage`, `CartPage`, `OrderFormPage` |
| `PopupLayout` | `popup-layout.tsx` | 팝업 창 전용 미니멀 레이아웃 | `PrivacyPolicyPage`, `TermsPage` 등 |

---

### 5-3. Composite 컴포넌트 (`src/components/composite/`)

> 기능 로직이 포함된 조합형 컴포넌트 (재사용 가능 + 상태 포함)

| 컴포넌트 | 파일 | 핵심 책임 | 주요 의존 |
|----------|------|-----------|-----------|
| `Header` | `header.tsx` | 헤더 슬롯(Title, Nav, Actions) compound | — |
| `MenuSheet` | `menu-sheet.tsx` | 모바일 햄버거 메뉴 시트 | `useAuthStore`, `useSignOut` |
| `SearchBar` | `search-bar.tsx` | 검색 입력창 | `useSearchStore` |
| `SearchSheet` | `search-sheet.tsx` | 날짜 필터 시트 (모바일) | `useSearchStore` |
| `ProtectedRoute` | `protected-route.tsx` | 인증 게이트, 미로그인 시 리다이렉트 | `useAuthStore` |
| `AuthErrorBoundary` | `auth-error-boundary.tsx` | 인증 에러 캐치 | — |
| `ImagePicker` | `image-picker.tsx` | 이미지 파일 선택 + 미리보기 | — |
| `ImageViewer` | `image-viewer.tsx` | 이미지 확대 뷰어 | — |
| `BulkApplySection` | `bulk-apply-section.tsx` | 일괄 쿠폰 적용 UI | `useCart` |
| `QuantitySelector` | `quantity-selector.tsx` | +/- 수량 선택 | — |
| `SelectField` | `select-field.tsx` | 레이블 + Select 합성 | `ui/select.tsx` |
| `CheckBoxField` | `check-box-field.tsx` | 레이블 + Checkbox 합성 | `ui/checkbox.tsx` |
| `PwInput` | `pw-input.tsx` | 비밀번호 보이기/숨기기 토글 | — |
| `Empty` | `empty.tsx` | 빈 상태 플레이스홀더 | — |
| `AdPanel` | `ad-panel.tsx` | 광고/배너 패널 | — |

---

### 5-4. UI 프리미티브 (`src/components/ui/`)

> Radix UI 기반 Headless + Tailwind CSS 스타일링

| 컴포넌트 | 기반 | 주요 사용처 |
|----------|------|-------------|
| `button.tsx` | Radix UI Slot + CVA | 전체 |
| `input.tsx` | HTML input | 폼 전체 |
| `textarea.tsx` | HTML textarea | 문의 폼 |
| `select.tsx` | Radix UI Select | 정렬, 배달 요청 |
| `checkbox.tsx` | Radix UI Checkbox | 필터, 동의 체크 |
| `radio-group.tsx` | Radix UI Radio | 옵션 선택 |
| `dialog.tsx` | Radix UI Dialog | 옵션 변경 모달 |
| `modal.tsx` | 커스텀 (useModalStore 구독) | 전역 확인 모달 |
| `sheet.tsx` | Vaul | 모바일 하단 시트 |
| `card.tsx` | Tailwind | 카드 컨테이너 |
| `badge.tsx` | Tailwind | 장바구니 카운트 뱃지 |
| `tabs.tsx` | Radix UI Tabs | 탭 UI |
| `accordion.tsx` | Radix UI Accordion | FAQ |
| `carousel.tsx` | Embla Carousel | 홈 배너, 상품 이미지 |
| `form.tsx` | React Hook Form `Controller` 래핑 | 폼 바인딩 |
| `slider.tsx` | Radix UI Slider | 가격 범위 필터 |
| `data-table.tsx` | 커스텀 | 테이블 렌더링 |
| `nav-link.tsx` | React Router `NavLink` 래핑 | 헤더 네비 |
| `sonner.tsx` | Sonner | 토스트 |
| `label.tsx` | Radix UI Label | 폼 라벨 |
| `switch.tsx` | Radix UI Switch | 수신 동의 토글 |
| `separator.tsx` | Radix UI Separator | 구분선 |
| `form-section.tsx` | 커스텀 | 폼 섹션 그루핑 |
| `required.tsx` | 커스텀 | 필수 입력 표시 `*` |
| `close.tsx` | 커스텀 | 닫기 버튼 |

---

### 5-5. 공유 유틸리티

| 파일 | 함수 | 핵심 책임 |
|------|------|-----------|
| `src/lib/utils.ts` | `cn(...ClassValue[])` | Tailwind 클래스 병합 |
| `src/lib/utils.ts` | `generateItemId(...parts)` | 상품ID+옵션ID+UUID로 CartItem ID 생성 |
| `src/lib/utils.ts` | `mergeRefs(...refs)` | 복수 ref 병합 |
| `src/lib/toast.ts` | `toast.success/error/warning/info/loading/promise` | Sonner 래퍼 |
| `src/utils/formatDate.ts` | `formatDate(date)` | 날짜 문자열 포맷 |
| `src/features/order/utils/calculate-discount.ts` | `calculateDiscount(price, coupon)` | percentage/fixed 쿠폰 할인액 계산 |
| `src/features/order/utils/calculated-order-totals.ts` | 총액 계산 | 주문서 최종 금액 산출 |
| `src/features/cart/utils/cart-local-storage.ts` | `getGuestItems/setGuestItems/clearGuest` 등 | localStorage 게스트 장바구니 CRUD |
| `src/features/shared/api/shared-mapper.ts` | 공통 DTO 변환 | 여러 feature에서 공유 |

---

## 6. 주요 호출 관계 요약 다이어그램

```
App.tsx
└─ Providers (index.tsx)
   ├─ QueryProvider → lib/query-client.ts
   ├─ AuthSyncProvider → lib/supabase.ts · store/auth.ts · auth.query.ts
   ├─ CartSyncProvider → cart/hooks/useCartAuthSync.ts
   └─ AppLayout (layout/app-layout.tsx)
      ├─ Header (composite/header.tsx)
      │  ├─ useCart() → cart/hooks/useCart.ts
      │  │  ├─ [로그인] cart-query.ts → cart-api.ts → supabase.rpc(get_cart_items)
      │  │  └─ [비로그인] cart-local-storage.ts → localStorage
      │  ├─ useAuthStore → store/auth.ts
      │  └─ useSearchStore → store/search.ts
      └─ Router (routes/index.tsx)
         ├─ 공개 라우트 → features/*/page.tsx
         └─ <ProtectedRoute> → store/auth.ts (initialized + user 검사)
            └─ 보호 라우트 → features/*/page.tsx
               ├─ Order: order-api.ts → supabase.functions.invoke("create-order")
               ├─ Order: order-api.ts → supabase.from("order_list_view")
               ├─ Coupon: coupons-api.ts → supabase.from("user_coupons")
               ├─ Shipping: shipping-api.ts → supabase.from("shipping_addresses")
               └─ Profile: profile-api.ts → supabase.from("profiles")
```

---

*이 문서는 실제 소스 코드 파싱 결과 기반. 추측 항목 없음.*
