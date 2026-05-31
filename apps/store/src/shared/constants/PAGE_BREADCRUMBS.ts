import type { PageBreadcrumbItem } from "@/shared/ui-extended/page-breadcrumb";
import { ROUTES } from "./ROUTES";

const HOME = { label: "홈", to: ROUTES.HOME } satisfies PageBreadcrumbItem;
const MY_PAGE = {
  label: "마이페이지",
  to: ROUTES.MY_PAGE,
} satisfies PageBreadcrumbItem;
const MY_INFO = {
  label: "내 정보",
  to: ROUTES.MY_PAGE_MY_INFO,
} satisfies PageBreadcrumbItem;
const ORDER_LIST = {
  label: "주문 내역",
  to: ROUTES.ORDER_LIST,
} satisfies PageBreadcrumbItem;
const CLAIM_LIST = {
  label: "취소/반품/교환 내역",
  to: ROUTES.CLAIM_LIST,
} satisfies PageBreadcrumbItem;
const QUOTE_REQUEST = {
  label: "견적 요청 내역",
  to: ROUTES.MY_PAGE_QUOTE_REQUEST,
} satisfies PageBreadcrumbItem;
const TOKEN_PURCHASE = {
  label: "토큰 충전",
  to: ROUTES.TOKEN_PURCHASE,
} satisfies PageBreadcrumbItem;

export const PAGE_BREADCRUMBS = {
  FAQ: [HOME, { label: "자주 묻는 질문" }],
  NOTICE: [HOME, { label: "공지사항" }],
  MY_PAGE: [HOME, { label: "마이페이지" }],
  MY_INFO: [HOME, MY_PAGE, { label: "내 정보" }],
  MY_INFO_DETAIL: [HOME, MY_PAGE, MY_INFO, { label: "회원정보 변경" }],
  MY_INFO_EMAIL: [HOME, MY_PAGE, MY_INFO, { label: "이메일 변경" }],
  MY_INFO_NOTICE: [HOME, MY_PAGE, MY_INFO, { label: "알림 설정" }],
  MY_INFO_LEAVE: [HOME, MY_PAGE, MY_INFO, { label: "회원 탈퇴" }],
  INQUIRY: [HOME, MY_PAGE, { label: "1:1 문의" }],
  TOKEN_HISTORY: [HOME, MY_PAGE, { label: "토큰 내역" }],
  QUOTE_REQUEST: [HOME, MY_PAGE, { label: "견적 요청 내역" }],
  QUOTE_REQUEST_DETAIL: [HOME, MY_PAGE, QUOTE_REQUEST, { label: "견적 상세" }],
  ORDER_LIST: [HOME, MY_PAGE, { label: "주문 내역" }],
  ORDER_DETAIL: [HOME, MY_PAGE, ORDER_LIST, { label: "주문 상세" }],
  REPAIR_SHIPPING: [HOME, MY_PAGE, ORDER_LIST, { label: "수선품 발송 등록" }],
  CLAIM_LIST: [HOME, MY_PAGE, { label: "취소/반품/교환 내역" }],
  CLAIM_DETAIL: [HOME, MY_PAGE, CLAIM_LIST, { label: "클레임 상세" }],
  TOKEN_PURCHASE: [HOME, { label: "토큰 충전" }],
  CART: [HOME, { label: "장바구니" }],
  CUSTOM_PAYMENT: [
    HOME,
    { label: "주문 제작", to: ROUTES.CUSTOM_ORDER },
    { label: "결제" },
  ],
  SAMPLE_PAYMENT: [
    HOME,
    { label: "샘플 제작", to: ROUTES.SAMPLE_ORDER },
    { label: "결제" },
  ],
  TOKEN_PURCHASE_PAYMENT: [HOME, TOKEN_PURCHASE, { label: "결제" }],
} satisfies Record<string, PageBreadcrumbItem[]>;
