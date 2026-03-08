import type { ContextChip } from "@/features/design/types/chat";

export const WELCOME_MESSAGE =
  "어떤 넥타이를 만들어드릴까요?\n색상, 패턴, 제작 방식을 자유롭게 말씀해주세요.";

export const QUICK_CHIPS: ContextChip[] = [
  {
    label: "클래식 비즈니스",
    action: "클래식 비즈니스 스타일로 네이비 색상 넥타이 만들어줘",
  },
  {
    label: "웨딩 스타일",
    action: "웨딩에 어울리는 우아한 실버 넥타이 부탁해",
  },
  {
    label: "기업 단체주문",
    action: "회사 로고 넣은 단체 넥타이 제작하고 싶어",
  },
  {
    label: "모던 미니멀",
    action: "모던하고 심플한 블랙 솔리드 넥타이 디자인해줘",
  },
];
