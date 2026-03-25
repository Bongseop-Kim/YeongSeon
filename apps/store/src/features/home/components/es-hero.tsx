import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui-extended/button";
import { HERO_CONTENT } from "@/features/home/constants/HOME_CONTENT";
import { scrollToSection } from "@/features/home/utils/scroll-to-section";
import { useBreakpoint } from "@/providers/breakpoint-provider";

export const EsHero = () => {
  const { isMobile } = useBreakpoint();
  const mobileSignals = ["딤플 몰드 자체 설계"];
  const desktopSignals = ["딤플 몰드 자체 설계", "스포데라토·세븐폴드 봉제"];
  const heroSignals = isMobile ? mobileSignals : desktopSignals;

  return (
    <section className="relative overflow-hidden bg-brand-ink text-brand-paper">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_30%),radial-gradient(circle_at_75%_20%,rgba(79,195,247,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
      <div className="mx-auto flex min-h-[calc(100svh-56px)] max-w-[1600px] flex-col px-[var(--space-showcase-section-x)] pb-10 pt-18 lg:flex-row lg:items-center lg:px-[var(--space-showcase-section-x-lg)] lg:pb-20 lg:pt-10">
        <div className="relative z-10 flex w-full flex-col justify-center lg:w-[42%]">
          {!isMobile ? (
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.35em] text-brand-gold">
              ESSE SION
            </p>
          ) : null}
          <h1 className="font-display text-[2.85rem] font-extrabold leading-[0.92] tracking-[-0.03em] text-brand-paper md:text-5xl lg:text-6xl xl:text-7xl">
            {HERO_CONTENT.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-[19rem] whitespace-pre-line text-sm leading-relaxed text-brand-paper/70 lg:mt-6 lg:max-w-md lg:text-lg">
            {HERO_CONTENT.subCopy.join("\n")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-brand-paper/72 lg:mt-8">
            {heroSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-[var(--radius-pill)] border border-white/8 bg-white/5 px-4 py-2"
              >
                {signal}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-10">
            <Button
              asChild
              size={isMobile ? "lg" : "xl"}
              className="rounded-[var(--radius-pill)] bg-white px-7 text-brand-ink hover:bg-brand-paper-muted"
            >
              <Link to={HERO_CONTENT.ctaSecondary.href}>
                {HERO_CONTENT.ctaSecondary.label}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size={isMobile ? "default" : "xl"}
              className="rounded-[var(--radius-pill)] border-white/12 bg-transparent px-7 text-white hover:bg-white/8 hover:text-white"
            >
              <Link
                to={HERO_CONTENT.ctaPrimary.href}
                onClick={scrollToSection(HERO_CONTENT.ctaPrimary.href)}
              >
                {HERO_CONTENT.ctaPrimary.label}
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-8 w-full lg:mt-0 lg:ml-auto lg:w-[52%]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[var(--radius-showcase-panel)] border border-white/6 [background-image:var(--gradient-brand-hero-stage)] shadow-[0_40px_120px_rgba(0,0,0,0.35)] lg:min-h-[700px]">
            <div className="absolute inset-0 [background-image:var(--gradient-brand-hero-overlay)]" />
            {!isMobile ? (
              <div className="absolute left-6 top-6 z-10 rounded-[var(--radius-showcase-card)] border border-white/6 bg-black/14 p-3 backdrop-blur-sm lg:left-8 lg:top-8">
                <img
                  src="/images/detail/fabric1.png"
                  alt="넥타이 원단 질감"
                  className="h-28 w-24 rounded-[calc(var(--radius-showcase-card)-0.25rem)] object-cover lg:h-40 lg:w-32"
                />
              </div>
            ) : null}

            <img
              src="/images/item/tie10.png"
              alt="골드 스트라이프 자동 넥타이"
              className="absolute inset-x-0 bottom-10 z-[1] mx-auto h-[82%] object-contain drop-shadow-[0_38px_42px_rgba(0,0,0,0.45)] lg:bottom-18 lg:h-[82%]"
            />

            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-brand-surface-strong via-brand-surface-strong/82 to-transparent px-[var(--space-showcase-panel-x)] pb-5 pt-24 lg:px-8 lg:pb-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                    Precision Crafted
                  </p>
                </div>
                <div className="flex items-center gap-6 text-white">
                  <div>
                    <p className="font-mono text-xl font-semibold tracking-[-0.03em] text-brand-gold lg:text-2xl">
                      2~3주
                    </p>
                    <p className="mt-1 text-xs text-white/56">평균 납기</p>
                  </div>
                  {!isMobile ? (
                    <div>
                      <p className="font-mono text-xl font-semibold tracking-[-0.03em] text-brand-gold lg:text-2xl">
                        100%
                      </p>
                      <p className="mt-1 text-xs text-white/56">자체 생산</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-mono text-xl font-semibold tracking-[-0.03em] text-brand-gold">
                        100%
                      </p>
                      <p className="mt-1 text-xs text-white/56">자체 진행</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
        <ChevronDown className="size-6 animate-bounce text-white/70" />
      </div>
    </section>
  );
};
