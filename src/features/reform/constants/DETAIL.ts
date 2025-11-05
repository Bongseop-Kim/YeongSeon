export const HEIGHT_GUIDE = [
  { height: "150cm", length: "41cm" },
  { height: "155cm", length: "43cm" },
  { height: "160cm", length: "45cm" },
  { height: "165cm", length: "47cm" },
  { height: "170cm", length: "49cm" },
  { height: "175cm", length: "51cm" },
  { height: "180cm", length: "53cm" },
  { height: "185cm", length: "55cm" },
  { height: "190cm", length: "57cm" },
];

export const TESTIMONIALS = [
  {
    category: "해외 학생",
    content:
      "한국 학교 다니는데 넥타이 매는 법 몰라서 힘들었어요. 이제 완전 편해요!",
    author: "유학생 A",
  },
  {
    category: "국내 학생",
    content: "고3인데 매일 아침 넥타이 때문에 스트레스였는데 이제 5초면 끝!",
    author: "○○고 김○○",
  },
  {
    category: "직장인",
    content: "신입사원 때 넥타이 못 매서 창피했는데, 이제 자신감 생겼어요",
    author: "회사원 최○○",
  },
];

export const FEATURES = [
  {
    title: "매일 아침 3분이 5초로 줄어들어요",
    description: "넥타이 못 매도 괜찮아요. 5초면 완벽하게 끝나거든요",
  },
  {
    title: "30년 장인이 직접 만들어요",
    description:
      "넥타이 전문 제조공장에서 하는 거라 다르거든요. 다른 곳에서는 못 받는 전문 기술이에요",
  },
  {
    title: "걱정 마세요, A/S 해드려요",
    description:
      "30년 경험이니까 자신 있게 약속드려요. 부품 고장 시 무료로 수리해드려요",
  },
  {
    title: "전국 어디든 보내드려요",
    description:
      "제주도든 울릉도든 상관없어요. 택배 배송으로 안전하게 받으실 수 있어요",
  },
  {
    title: "키에 맞춰서 딱 맞게 만들어드려요",
    description:
      "150cm부터 190cm까지 괜찮아요. 키에 맞는 길이로 딱 맞게 만들어드려요",
  },
];

export const TARGET_CUSTOMERS = [
  {
    title: "해외 유학생",
    description: "한국 학교 넥타이 매기, 진짜 어려운 거 맞아요",
  },
  {
    title: "중고등학생",
    description: "넥타이 때문에 지각할 뻔한 적 있으시죠?",
  },
  {
    title: "직장 신입사원",
    description: "첫 출근날 넥타이 못 매서 당황했던 기억 있으시죠?",
  },
  {
    title: "매일 착용 직장인",
    description: "아침마다 3분이 아까우셨죠? 이제 5초면 돼요",
  },
];

const originalBannerImages = [
  { src: "/images/detail/tie1.png", alt: "tie1" },
  { src: "/images/detail/tie2.png", alt: "tie2" },
  { src: "/images/detail/tie3.png", alt: "tie3" },
  { src: "/images/detail/tie4.png", alt: "tie4" },
  { src: "/images/detail/tie5.png", alt: "tie5" },
  { src: "/images/detail/tie6.png", alt: "tie6" },
  { src: "/images/detail/tie7.png", alt: "tie7" },
  { src: "/images/detail/tie8.png", alt: "tie8" },
  { src: "/images/detail/tie9.png", alt: "tie9" },
  { src: "/images/detail/tie10.png", alt: "tie10" },
  { src: "/images/detail/tie11.png", alt: "tie11" },
  { src: "/images/detail/tie12.png", alt: "tie12" },
  { src: "/images/detail/tie13.png", alt: "tie13" },
  { src: "/images/detail/tie14.png", alt: "tie14" },
  { src: "/images/detail/tie15.png", alt: "tie15" },
  { src: "/images/detail/tie16.png", alt: "tie16" },
  { src: "/images/detail/tie17.png", alt: "tie17" },
  { src: "/images/detail/tie18.png", alt: "tie18" },
  { src: "/images/detail/tie19.png", alt: "tie19" },
  { src: "/images/detail/tie20.png", alt: "tie20" },
  { src: "/images/detail/fabric1.png", alt: "fabric1" },
  { src: "/images/detail/fabric2.png", alt: "fabric2" },
  { src: "/images/detail/fabric3.png", alt: "fabric3" },
  { src: "/images/detail/fabric4.png", alt: "fabric4" },
  { src: "/images/detail/fabric5.png", alt: "fabric5" },
  { src: "/images/detail/fabric6.png", alt: "fabric6" },
  { src: "/images/detail/fabric7.png", alt: "fabric7" },
  { src: "/images/detail/fabric8.png", alt: "fabric8" },
  { src: "/images/detail/fabric9.png", alt: "fabric9" },
];

const shuffleArray = (array: typeof originalBannerImages) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const BANNER_IMAGES = [
  ...shuffleArray(originalBannerImages),
  ...shuffleArray(originalBannerImages),
];
