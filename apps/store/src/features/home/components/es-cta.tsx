import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui-extended/button";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import { CTA_CONTENT } from "@/features/home/constants/HOME_CONTENT";

export const EsCta = () => {
  const [primaryButton, secondaryButton] = CTA_CONTENT.buttons;
  const { quickStarts } = CTA_CONTENT;

  return (
    <section className="bg-brand-surface py-24 text-brand-paper lg:py-32">
      <HomeSectionContainer>
        <div className="grid gap-4 border-b border-white/8 pb-10 text-left sm:grid-cols-3">
          {quickStarts.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="group border-b border-white/8 pb-4 transition duration-300 hover:translate-x-1 sm:border-b-0 sm:border-r sm:pr-4 last:sm:border-r-0"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-gold">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-brand-paper/70">
                {item.description}
              </p>
              <p className="mt-5 text-sm text-brand-paper transition-transform duration-300 group-hover:translate-x-1">
                바로 가기 →
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex w-full flex-col gap-8 lg:mt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-xl lg:flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-gold">
              Final Step
            </p>
            <p className="font-display mt-4 text-2xl font-bold tracking-[-0.02em] text-brand-paper lg:text-4xl">
              편한 방식으로 바로 시작하시면 됩니다.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-brand-paper/65">
              원단 디자인, 수선 문의, 카카오톡 상담 중 가장 빠른 경로를
              선택하세요.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:shrink-0 lg:justify-end">
            <Button
              asChild
              size="lg"
              className="rounded-[var(--radius-pill)] bg-white px-7 font-semibold text-brand-heading hover:bg-zinc-100"
            >
              <Link to={primaryButton.href}>{primaryButton.label}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-[var(--radius-pill)] border-white/12 bg-transparent px-7 text-white hover:bg-white/8 hover:text-white"
            >
              <Link to={secondaryButton.href}>{secondaryButton.label}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="rounded-[var(--radius-pill)] bg-brand-kakao px-7 font-semibold text-brand-heading hover:bg-brand-kakao-hover"
            >
              <a
                href={CTA_CONTENT.kakaoChannelHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                카카오톡 상담
              </a>
            </Button>
          </div>
        </div>
      </HomeSectionContainer>
    </section>
  );
};
