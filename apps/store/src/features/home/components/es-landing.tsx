import type { Product } from "@yeongseon/shared/types/view/product";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/constants/ROUTES";
import { cn } from "@/shared/lib/utils";
import { EsProductGrid } from "@/features/home/components/es-product-grid";

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

const SectionHeader = ({
  title,
  more,
  href,
}: {
  title: string;
  more?: string;
  href?: string;
}) => (
  <div className="flex items-end justify-between pb-3 pt-9 md:pb-3 md:pt-14">
    <h2 className="m-0 text-[18px] font-bold tracking-[-0.03em] md:text-2xl">
      {title}
    </h2>
    {href && more ? (
      <Link
        to={href}
        className="text-[12.5px] text-[#999] md:text-[13.5px] md:text-[#555]"
      >
        {more} →
      </Link>
    ) : more ? (
      <span className="text-[12.5px] text-[#999] md:text-[13.5px] md:text-[#555]">
        {more} →
      </span>
    ) : null}
  </div>
);

const HERO_BANNERS: {
  tag: string;
  title: string;
  image: string;
  alt: string;
  href: string;
}[] = [
  {
    tag: "AI",
    title: "쉽고 간편하게\n30초 만에 만들기",
    image: "/images/home/ai.png",
    alt: "AI 디자인 생성",
    href: ROUTES.DESIGN,
  },
  {
    tag: "CUSTOM",
    title: "행사와 단체를 위한\n주문 제작",
    image: "/images/home/custom.png",
    alt: "주문 제작",
    href: ROUTES.CUSTOM_ORDER,
  },
  {
    tag: "STORE",
    title: "2026 봄\n실크 9종 입고",
    image: "/images/home/showcase.png",
    alt: "넥타이 스토어",
    href: ROUTES.SHOP,
  },
  {
    tag: "REPAIR",
    title: "수동 넥타이를\n자동 넥타이로",
    image: "/images/home/repair.png",
    alt: "넥타이 수선",
    href: ROUTES.REFORM,
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
          <Link
            key={b.tag}
            to={b.href}
            className={cn(
              "relative block flex-[0_0_100%] cursor-pointer snap-start overflow-hidden",
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
          </Link>
        ))}
      </div>
    </Wrap>
  </section>
);

type CaseItem = { nm: string; desc: string; image: string };

const CaseSection = ({
  title,
  more,
  href,
  items,
}: {
  title: string;
  more: string;
  href?: string;
  items: CaseItem[];
}) => (
  <Wrap>
    <SectionHeader title={title} more={more} href={href} />
    <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2 md:gap-4">
      {items.map((it, i) => {
        const content = (
          <>
            <img
              src={it.image}
              alt={it.nm}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover"
            />
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
          </>
        );
        const className = cn(
          "relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:aspect-[5/4] md:rounded-[14px]",
          "transition-transform duration-200 hover:-translate-y-0.5",
        );

        return href ? (
          <Link key={it.nm} to={href} className={cn("block", className)}>
            {content}
          </Link>
        ) : (
          <article key={it.nm} className={className}>
            {content}
          </article>
        );
      })}
    </div>
  </Wrap>
);

const LOOKBOOK_ITEMS: {
  alt: string;
  image: string;
  main?: boolean;
}[] = [
  {
    alt: "AI로 만든 넥타이 디자인",
    image: "/images/home/tile.png",
    main: true,
  },
  { alt: "AI 넥타이 디자인 예시 1", image: "/images/home/1.png" },
  { alt: "AI 넥타이 디자인 예시 2", image: "/images/home/2.png" },
  { alt: "AI 넥타이 디자인 예시 3", image: "/images/home/3.png" },
  { alt: "AI 넥타이 디자인 예시 4", image: "/images/home/4.png" },
];

const Lookbook = () => (
  <Wrap>
    <SectionHeader
      title="문장 하나로 만드는 넥타이 디자인"
      more="AI 디자인 생성"
      href={ROUTES.DESIGN}
    />
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pt-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "md:mx-0 md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[240px_240px] md:gap-3 md:overflow-visible md:px-0",
      )}
    >
      {LOOKBOOK_ITEMS.map((it) => (
        <Link
          key={it.image}
          to={ROUTES.DESIGN}
          className={cn(
            "relative block h-[320px] flex-[0_0_240px] cursor-pointer snap-start overflow-hidden rounded-xl",
            "md:h-auto md:flex-none md:rounded-[14px]",
            it.main && "md:row-span-2 md:flex-[0_0_280px]",
          )}
        >
          <img
            src={it.image}
            alt={it.alt}
            loading={it.main ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </Link>
      ))}
    </div>
  </Wrap>
);

const PARTNERS = [
  {
    name: "경찰청",
    image: "/images/home/partner-police.png",
  },
  {
    name: "교정본부",
    image: "/images/home/partner-corrections.png",
  },
  {
    name: "대전",
    image: "/images/home/partner-daejeon.png",
  },
  {
    name: "우체국",
    image: "/images/home/partner-post.png",
  },
];

const Partners = () => {
  return (
    <section className="py-11 md:py-16">
      <Wrap>
        <div className="mb-6 text-center md:mb-9">
          <h3 className="m-0 mb-1.5 text-[18px] font-bold tracking-[-0.03em] md:text-2xl">
            믿고 맡길 수 있는 제작 경험
          </h3>
          <div className="text-[11.5px] text-[#aaa] md:text-[12px]">
            관공서·기업·단체 납품 경험을 바탕으로 꼼꼼하게 제작합니다
          </div>
        </div>
        <div className="grid grid-cols-2 items-center justify-items-center gap-2 md:grid-cols-4 md:gap-x-6">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "grid h-11 w-full place-items-center rounded-lg bg-[#F6F6F4] px-3",
                "transition-colors hover:bg-[#EFEFE9] md:h-12 md:rounded-[10px] md:px-4",
              )}
            >
              <img
                src={p.image}
                alt={`${p.name} 로고`}
                loading="lazy"
                className="max-h-7 max-w-[78%] object-contain md:max-h-8"
              />
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
    q: "손으로 매번 묶던 넥타이를 자동 매듭으로 바꾸니 출근 준비가 훨씬 편해졌어요.",
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
    <SectionHeader title="먼저 써본 분들 이야기" />
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
      title="단체의 분위기에 맞춰 제작해요"
      more="주문 제작 상담하기"
      href={ROUTES.CUSTOM_ORDER}
      items={[
        {
          nm: "워크숍과 행사에 맞춘 기업 넥타이",
          desc: "로고, 컬러, 행사 분위기를 반영해 제작합니다",
          image: "/images/home/custom1.png",
        },
        {
          nm: "관공서 단체 착용을 위한 넥타이",
          desc: "격식 있는 자리에도 어울리도록 단정하게 완성합니다",
          image: "/images/home/custom2.png",
        },
      ]}
    />
    <Lookbook />
    <CaseSection
      title="수동 넥타이, 자동 매듭으로 바꿔보세요"
      more="수선 맡기기"
      href={ROUTES.REFORM}
      items={[
        {
          nm: "손으로 묶던 넥타이를 간편한 자동 매듭으로",
          desc: "매번 매듭을 잡지 않아도 단정하게 착용할 수 있어요",
          image: "/images/home/repair1.png",
        },
        {
          nm: "행사·출근용 넥타이를 더 편하게 착용",
          desc: "기존 넥타이의 분위기는 살리고 착용 방식만 바꿔드려요",
          image: "/images/home/repair2.png",
        },
      ]}
    />
    <Partners />
    <Reviews />
    <div className="h-12 md:h-16" />
  </div>
);
