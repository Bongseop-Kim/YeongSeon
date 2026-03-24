export const ROUTES = {
  HOME: "/",
  SHOP: "/shop", // 스토어
  DESIGN: "/design", // 디자인
  CUSTOM_ORDER: "/custom-order", // 주문 제작
  SAMPLE_ORDER: "/sample-order", // 샘플 제작
  REFORM: "/reform", // 수선
  CART: "/cart", // 장바구니
  ORDER_FORM: "/order/order-form", // 주문서
  ORDER_LIST: "/order/order-list", // 주문 내역
  ORDER_DETAIL: "/order", // 주문 상세
  CLAIM_LIST: "/order/claim-list", // 취소 내역
  CLAIM_FORM: "/order/claim", // 취소 신청
  CLAIM_DETAIL: "/order/claim-detail", // 클레임 상세
  PAYMENT_SUCCESS: "/order/payment/success", // 결제 성공
  PAYMENT_FAIL: "/order/payment/fail", // 결제 실패
  SHIPPING: "/shipping", // 배송
  SHIPPING_FORM: "/shipping/form", // 배송 정보
  MY_PAGE: "/my-page", // 마이페이지
  MY_PAGE_MY_INFO: "/my-page/my-info", // 내 정보
  MY_PAGE_MY_INFO_DETAIL: "/my-page/my-info/detail", // 개인정보 수정
  MY_PAGE_MY_INFO_EMAIL: "/my-page/my-info/email", // 이메일 변경
  MY_PAGE_MY_INFO_NOTICE: "/my-page/my-info/notice", // 마케팅 수신 동의
  MY_PAGE_MY_INFO_LEAVE: "/my-page/my-info/leave", // 회원 탈퇴
  MY_PAGE_INQUIRY: "/my-page/inquiry", // 문의하기
  MY_PAGE_QUOTE_REQUEST: "/my-page/quote-request", // 견적 요청 내역
  MY_PAGE_QUOTE_REQUEST_DETAIL: "/my-page/quote-request/:id", // 견적 요청 상세
  MY_PAGE_TOKEN_HISTORY: "/my-page/token-history", // 토큰 내역
  FAQ: "/faq", // 자주 묻는 질문
  NOTICE: "/notice", // 공지사항
  PRIVACY_POLICY: "/privacy-policy", // 개인정보처리방침
  TERMS_OF_SERVICE: "/terms-of-service", // 이용약관
  REFUND_POLICY: "/refund-policy", // 환불정책
  LOGIN: "/login", // 로그인
  TOKEN_PURCHASE: "/token/purchase", // 토큰 구매 (플랜 선택)
  TOKEN_PURCHASE_PAYMENT: "/token/purchase/payment", // 토큰 구매 결제
  TOKEN_PURCHASE_SUCCESS: "/token/purchase/success", // 토큰 구매 성공
  TOKEN_PURCHASE_FAIL: "/token/purchase/fail", // 토큰 구매 실패
  REPAIR_SHIPPING: "/order/repair-shipping", // 수선품 발송
} as const;

type ClaimRouteType = "return" | "exchange" | "cancel" | "token_refund";

/**
 * 클레임 신청 폼 경로 생성 (기존 buildClaimDetailRoute에서 rename)
 */
export const buildClaimFormRoute = (
  type: ClaimRouteType,
  orderId: string,
  itemId: string,
) => `${ROUTES.CLAIM_FORM}/${type}/${orderId}/${itemId}`;

/**
 * 클레임 상세 페이지 경로 생성
 */
export const buildClaimDetailRoute = (claimId: string) =>
  `${ROUTES.CLAIM_DETAIL}/${claimId}`;
