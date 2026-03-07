export interface OnboardingPage {
  title: string;
  description: string;
  emoji: string;
}

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    title: "선염 (직조)",
    description:
      "실을 먼저 염색한 뒤 직조하는 방식입니다. 패턴이 원단 깊이 스며들어 앞뒤 모두 동일하게 표현되며, 고급스러운 질감과 내구성이 특징입니다.",
    emoji: "🧵",
  },
  {
    title: "날염 (프린팅)",
    description:
      "완성된 원단 위에 패턴을 인쇄하는 방식입니다. 복잡한 이미지나 그라데이션 표현에 유리하며, CI 로고 등 세밀한 디자인 재현에 적합합니다.",
    emoji: "🖨️",
  },
];
