import type { Product } from "@yeongseon/shared/types/view/product";

import { cn } from "@/shared/lib/utils";
import { EsProductGrid } from "@/features/home/components/es-product-grid";

type PhKind = "default" | "alt" | "dark";

const phKindClass: Record<PhKind, string> = {
  default: "bg-[#EAEAE6]",
  alt: "bg-[#E0E0DC]",
  dark: "bg-[#1a1a1a]",
};

type PhProps = {
  kind?: PhKind;
  size?: string;
  className?: string;
};

const Ph = ({ kind = "default", size, className }: PhProps) => (
  <div
    className={cn(
      "relative h-full w-full overflow-hidden",
      phKindClass[kind],
      className,
    )}
  >
    {size && (
      <span
        className={cn(
          "absolute bottom-3 right-3 font-mono text-[10.5px] tracking-[0.1em]",
          kind === "dark" ? "text-white/45" : "text-black/40",
        )}
      >
        {size}
      </span>
    )}
  </div>
);

const Wrap = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("mx-auto w-full max-w-[1280px] px-4 md:px-6", className)}>
    {children}
  </div>
);

const SectionHeader = ({ title, more }: { title: string; more: string }) => (
  <div className="flex items-end justify-between pb-3 pt-9 md:pb-3 md:pt-14">
    <h2 className="m-0 text-[18px] font-bold tracking-[-0.03em] md:text-2xl">
      {title}
    </h2>
    <span className="text-[12.5px] text-[#999] md:text-[13.5px] md:text-[#555]">
      {more} →
    </span>
  </div>
);

const HERO_BANNERS: {
  tag: string;
  title: string;
  image: string;
  alt: string;
}[] = [
  {
    tag: "NEW",
    title: "AI로 내 패턴\n30초 만에 만들기",
    image: "/images/home/ai.png",
    alt: "AI 디자인 생성",
  },
  {
    tag: "CUSTOM",
    title: "4개부터 시작하는\n주문 제작",
    image: "/images/home/custom.png",
    alt: "주문 제작",
  },
  {
    tag: "STORE",
    title: "2026 봄\n실크 9종 입고",
    image: "/images/home/showcase.png",
    alt: "넥타이 스토어",
  },
  {
    tag: "REPAIR",
    title: "낡은 넥타이\n새로 고쳐 매기",
    image: "/images/home/repair.png",
    alt: "넥타이 수선",
  },
];

const Hero = () => (
  <section className="md:pt-6">
    <Wrap className="px-0 md:px-6">
      <div
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:grid md:grid-cols-4 md:gap-3 md:overflow-visible",
        )}
      >
        {HERO_BANNERS.map((b, i) => (
          <article
            key={b.tag}
            className={cn(
              "relative flex-[0_0_100%] cursor-pointer snap-start overflow-hidden",
              "aspect-[4/5] rounded-none",
              "md:aspect-[3/4] md:flex-none md:rounded-[14px]",
              "transition-transform duration-200 hover:-translate-y-0.5",
            )}
          >
            <img
              src={b.image}
              alt={b.alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,.55) 100%)",
              }}
            />
            <div className="absolute inset-x-5 bottom-7 z-10 text-white md:inset-x-[18px] md:bottom-5">
              <div className="text-[10.5px] font-semibold tracking-[0.12em] opacity-85 md:text-[11px]">
                {b.tag}
              </div>
              <h3 className="m-0 mt-1.5 whitespace-pre-line text-[22px] font-bold leading-[1.25] tracking-[-0.025em] md:text-[19px]">
                {b.title}
              </h3>
            </div>
          </article>
        ))}
      </div>
    </Wrap>
  </section>
);

type CaseItem = { nm: string; desc: string };

const CaseSection = ({
  title,
  more,
  items,
}: {
  title: string;
  more: string;
  items: CaseItem[];
}) => (
  <Wrap>
    <SectionHeader title={title} more={more} />
    <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2 md:gap-4">
      {items.map((it, i) => (
        <article
          key={it.nm}
          className={cn(
            "relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:aspect-[5/4] md:rounded-[14px]",
            "transition-transform duration-200 hover:-translate-y-0.5",
          )}
        >
          <Ph kind={i % 2 === 0 ? "default" : "alt"} size="640 × 512" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.6) 100%)",
            }}
          />
          <div className="absolute inset-x-[18px] bottom-[18px] z-10 text-white md:inset-x-[22px] md:bottom-[22px]">
            <div className="mb-1 text-[16px] font-bold leading-[1.3] tracking-[-0.025em] md:mb-1.5 md:text-[19px]">
              {it.nm}
            </div>
            <div className="text-[12px] opacity-85 md:text-[13px]">
              {it.desc}
            </div>
          </div>
        </article>
      ))}
    </div>
  </Wrap>
);

const LOOKBOOK_ITEMS: {
  kind: PhKind;
  label: string;
  size: string;
  main?: boolean;
}[] = [
  {
    kind: "default",
    label: "네이비 스트라이프 × 블랙 수트",
    size: "640 × 500",
    main: true,
  },
  { kind: "alt", label: "그레이 도트", size: "320 × 240" },
  { kind: "default", label: "와인 솔리드", size: "320 × 240" },
  { kind: "alt", label: "페이즐리", size: "320 × 240" },
  { kind: "dark", label: "블랙 솔리드", size: "320 × 240" },
];

const Lookbook = () => (
  <Wrap>
    <SectionHeader title="이렇게 매보세요" more="스타일 더 보기" />
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pt-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "md:mx-0 md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[240px_240px] md:gap-3 md:overflow-visible md:px-0",
      )}
    >
      {LOOKBOOK_ITEMS.map((it) => (
        <article
          key={it.label}
          className={cn(
            "relative h-[320px] flex-[0_0_240px] cursor-pointer snap-start overflow-hidden rounded-xl",
            "md:h-auto md:flex-none md:rounded-[14px]",
            it.main && "md:row-span-2 md:flex-[0_0_280px]",
          )}
        >
          <Ph kind={it.kind} size={it.size} />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.5) 100%)",
            }}
          />
          <div className="absolute inset-x-3.5 bottom-3 z-10 flex items-center justify-between text-[12px] font-semibold text-white md:inset-x-4 md:bottom-3.5 md:text-[13.5px]">
            <span>{it.label}</span>
            <span>→</span>
          </div>
        </article>
      ))}
    </div>
  </Wrap>
);

const PARTNERS = Array.from(
  { length: 12 },
  (_, i) => `LOGO ${String(i + 1).padStart(2, "0")}`,
);

const Partners = () => {
  return (
    <section className="py-11 md:py-16">
      <Wrap>
        <div className="mb-6 text-center md:mb-9">
          <h3 className="m-0 mb-1.5 text-[18px] font-bold tracking-[-0.03em] md:text-2xl">
            조용히 오래 함께한 곳들
          </h3>
          <div className="text-[11.5px] text-[#aaa] md:text-[12px]">
            120개 이상의 기업·단체와 함께해요
          </div>
        </div>
        <div className="grid grid-cols-3 items-center justify-items-center gap-x-2 gap-y-2 md:grid-cols-6 md:gap-x-6 md:gap-y-9">
          {PARTNERS.map((p) => (
            <div
              key={p}
              className={cn(
                "grid h-11 w-full place-items-center rounded-lg bg-[#F6F6F4]",
                "font-mono text-[10px] tracking-[0.12em] text-[#aaa] transition-colors",
                "hover:bg-[#EFEFE9] md:h-14 md:rounded-[10px] md:text-[11.5px]",
              )}
            >
              {p}
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
};

const REVIEWS = [
  {
    q: "한 줄 입력했더니 시안 4개가 바로 나와서, 그중 하나로 30개 주문했어요. 결혼식 답례용이었는데 다들 좋아했어요.",
    nm: "김ㅈㅎ",
    from: "주문 제작",
  },
  {
    q: "낡아서 안 매던 넥타이를 자동으로 고쳤어요. 새로 산 것 같아서 출근할 때마다 매고 있어요.",
    nm: "이ㅅㅎ",
    from: "수선",
  },
  {
    q: "실크 도트 샀는데 매듭이 잘 잡혀요. 가격도 부담 없고, 다음에는 다른 색도 사 볼래요.",
    nm: "박ㄱㅁ",
    from: "스토어",
  },
];

const Reviews = () => (
  <Wrap>
    <SectionHeader title="먼저 써본 분들 이야기" more="리뷰 더 보기" />
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pt-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0",
      )}
    >
      {REVIEWS.map((r) => (
        <article
          key={r.nm}
          className={cn(
            "flex-[0_0_78%] snap-start rounded-xl bg-[#F6F6F4] p-[18px]",
            "md:flex-none md:rounded-[14px] md:p-[22px]",
          )}
        >
          <div className="mb-2.5 text-[14px] text-[#111]">★★★★★</div>
          <p className="m-0 mb-4 text-[13.5px] leading-[1.55] md:text-[14.5px] md:leading-[1.6]">
            {r.q}
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-[#ddd]" />
            <div>
              <div className="text-[12.5px] font-semibold">{r.nm}</div>
              <div className="text-[11.5px] text-[#888]">{r.from}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  </Wrap>
);

type EsLandingProps = {
  products: Product[];
  isProductsLoading?: boolean;
};

export const EsLanding = ({ products, isProductsLoading }: EsLandingProps) => (
  <div className="text-[#111] antialiased [letter-spacing:-0.015em]">
    <Hero />
    <EsProductGrid items={products} isLoading={isProductsLoading} />
    <CaseSection
      title="이렇게 만드는 분들이 있어요"
      more="내 디자인 만들래요"
      items={[
        {
          nm: "한 줄 입력으로 만든 회사 단체용 패턴",
          desc: '"네이비 바탕에 작은 도트, 차분하게" 라고 입력했어요',
        },
        {
          nm: "결혼식 답례용 30개, 30분 만에 완성",
          desc: "AI 시안 4개 중에 골라 바로 주문했어요",
        },
      ]}
    />
    <Lookbook />
    <CaseSection
      title="요즘 맡기는 수선, 이런 거예요"
      more="수선 맡기기"
      items={[
        {
          nm: "20년 된 아버지 넥타이, 자동으로 다시 매기",
          desc: "낡은 수동 넥타이를 자동으로 바꿔드렸어요",
        },
        {
          nm: "결혼식용으로 길이 줄이고 매듭선 새로 잡기",
          desc: "몸에 맞게 깔끔하게 다듬었어요",
        },
      ]}
    />
    <Partners />
    <Reviews />
    <div className="h-12 md:h-16" />
  </div>
);
