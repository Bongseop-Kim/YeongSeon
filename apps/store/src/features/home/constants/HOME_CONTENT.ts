import { ROUTES } from "@/constants/ROUTES";
import type { ManufacturingStep } from "@/features/home/types/home";

export const HERO_CONTENT = {
  headline: ["자동 넥타이를", "다시 설계했습니다"],
  subCopy: [
    "딤플 몰드부터 스포데라토·세븐폴드 봉제까지.",
    "30년 기술로 완성한 자동 넥타이입니다.",
  ],
  ctaPrimary: { label: "어떻게 만드나요", href: "#manufacturing" },
  ctaSecondary: { label: "제품 보기", href: ROUTES.SHOP },
} as const;

export const AI_DESIGN_CONTENT = {
  headline: "원단 디자인, 프리뷰로 바로 확인",
  subCopy:
    "GPT·Gemini 기반 AI와 채팅하듯 패턴을 만듭니다. 선염의 깊이, 날염의 선명함까지 질감 그대로 미리볼 수 있습니다.",
  features: [
    "채팅 한 줄로 패턴·컬러·질감을 동시에 설정",
    "선염·날염 원단의 질감 차이까지 시각적으로 구분",
    "디자인 확정 즉시 제작 요청",
  ],
  cta: { label: "지금 디자인하기", href: ROUTES.DESIGN },
} as const;

export const REFORM_CONTENT = {
  headline: "매듭 없이, 원하는 모양으로",
  subCopy:
    "수동 넥타이를 보내주시면 자동 구조로 다시 만들어드립니다. 매듭 종류를 직접 선택할 수 있고, 자체 몰드 기술로 튼튼하게 제작합니다.",
  steps: [
    "수동 넥타이 접수",
    "매듭 종류 선택 후 자동 구조 전환",
    "자동 넥타이로 수령",
  ],
  cta: { label: "수선 신청하기", href: ROUTES.REFORM },
} as const;

export const MANUFACTURING_STEPS: ManufacturingStep[] = [
  {
    step: 1,
    label: "AI 디자인",
    description: "GPT·Gemini 기반 AI로 채팅하듯 원단 패턴을 디자인합니다.",
    imageSrc: "/images/detail/product1.png",
    imageAlt: "AI 디자인으로 원단 패턴을 설계하는 장면",
    eyebrow: "AI Design",
  },
  {
    step: 2,
    label: "간편한 주문",
    description: "원하는 옵션을 선택해 PC·모바일 어디서나 주문합니다.",
    imageSrc: "/images/detail/product1.png",
    imageAlt: "주문 옵션을 선택하는 화면",
    eyebrow: "Easy Order",
  },
  {
    step: 3,
    label: "전자 결제",
    description: "카드·간편결제 등 다양한 결제 수단을 지원합니다.",
    imageSrc: "/images/detail/product1.png",
    imageAlt: "온라인 결제 단계를 보여주는 화면",
    eyebrow: "Payment",
  },
  {
    step: 4,
    label: "제작 & 배송",
    description: "2~3주 내 제작 완료 후 바로 배송됩니다.",
    imageSrc: "/images/detail/product1.png",
    imageAlt: "제작 완료 후 배송 준비된 넥타이",
    eyebrow: "Production",
  },
];

export const MANUFACTURING_CONTENT = {
  headline: "디자인부터 결제까지\n온라인으로",
  subCopy: [
    "사이트에서 AI로 디자인하고 주문까지 바로 넣습니다.",
    "대부분의 봉제 공장에 없는 전자 주문 시스템입니다.",
  ],
} as const;

export const BRAND_STORY_CONTENT = {
  quote: "튼튼하고, 기술적으로 앞서고,\n아름다워야 합니다.",
  stats: [
    { value: "30+", label: "년 업력" },
    { value: "50,000+", label: "누적 제작" },
  ],
} as const;

export const CTA_CONTENT = {
  headline: "여기서 골라 바로 시작하세요",
  quickStarts: [
    {
      label: "수선",
      description: "수동 넥타이를 자동 넥타이 구조로 바꿔드립니다.",
      href: ROUTES.REFORM,
    },
    {
      label: "AI 디자인",
      description: "패턴을 입력하면 넥타이 완성 이미지를 바로 확인합니다.",
      href: ROUTES.DESIGN,
    },
    {
      label: "스토어",
      description: "바로 주문 가능한 자동 넥타이를 살펴봅니다.",
      href: ROUTES.SHOP,
    },
  ],
  primary: { label: "원단 디자인하기", href: ROUTES.DESIGN },
  secondary: { label: "수선 문의하기", href: ROUTES.REFORM },
  kakaoChannelHref: import.meta.env.VITE_KAKAO_CHANNEL_URL || ROUTES.REFORM,
} as const;
