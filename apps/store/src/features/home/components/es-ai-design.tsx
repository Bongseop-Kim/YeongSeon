import { Link } from "react-router-dom";

import { Button } from "@/components/ui-extended/button";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import { AI_DESIGN_CONTENT } from "@/features/home/constants/HOME_CONTENT";

export const EsAiDesign = () => {
  return (
    <section className="bg-white py-20 lg:py-28">
      <HomeSectionContainer className="grid gap-12 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-center">
        <div className="lg:pr-8">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
            AI DESIGN
          </p>
          <h2 className="font-display mt-4 max-w-md text-3xl font-bold leading-[0.97] tracking-[-0.03em] text-brand-heading lg:text-[4rem]">
            {AI_DESIGN_CONTENT.headline}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
            {AI_DESIGN_CONTENT.subCopy}
          </p>
          <div className="mt-8 grid gap-0 border-y border-black/6">
            {AI_DESIGN_CONTENT.features.map((feature) => (
              <div
                key={feature}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-4 text-brand-heading"
              >
                <span className="mt-1 size-1.5 rounded-full bg-brand-accent" />
                <p className="text-sm leading-relaxed text-brand-heading/62">
                  {feature}
                </p>
              </div>
            ))}
          </div>
          <Button
            asChild
            size="lg"
            className="mt-8 rounded-[var(--radius-pill)] bg-brand-surface px-7 text-white hover:bg-brand-ink"
          >
            <Link to={AI_DESIGN_CONTENT.cta.href}>
              {AI_DESIGN_CONTENT.cta.label}
            </Link>
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-[var(--radius-showcase-panel)] bg-brand-ink">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(214,174,76,0.18),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.09),transparent_18%)]" />
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(240px,0.52fr)]">
            <div className="relative min-h-[420px] overflow-hidden lg:min-h-[560px]">
              <img
                src="/images/item/tie10.png"
                alt="AI 디자인 결과로 완성된 넥타이 프리뷰"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,20,28,0.58),rgba(18,20,28,0.12)_48%,rgba(18,20,28,0.76))]" />
              <div className="absolute left-5 top-5 z-10 lg:left-8 lg:top-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-gold">
                  Preview
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6 pt-24 lg:px-8 lg:pb-8">
                <div className="max-w-sm">
                  <p className="font-display text-[2rem] font-bold leading-[0.95] tracking-[-0.04em] text-brand-paper lg:text-[3rem]">
                    완성될 넥타이를
                    <br />
                    먼저 봅니다
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-brand-paper/74">
                    패턴과 컬러를 정하면 실물에 가까운 결과 이미지를 먼저
                    확인하고, 그대로 제작 요청으로 이어집니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-px border-t border-white/8 bg-white/8 lg:border-l lg:border-t-0">
              <div className="bg-brand-paper-muted/96 px-5 py-5 text-brand-heading lg:px-6 lg:py-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                  Prompt
                </p>
                <p className="mt-3 text-sm leading-relaxed text-brand-heading/72">
                  차분한 네이비 스트라이프, 결혼식보다 데일리 착장에 어울리게
                </p>
              </div>
              <div className="bg-brand-paper-muted/96 px-5 py-5 text-brand-heading lg:px-6 lg:py-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                  Result
                </p>
                <p className="mt-3 text-sm leading-relaxed text-brand-heading/72">
                  광택보다 직조감이 먼저 보이고, 셔츠와 재킷 톤까지 함께 상상할
                  수 있는 프리뷰를 만듭니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </HomeSectionContainer>
    </section>
  );
};
