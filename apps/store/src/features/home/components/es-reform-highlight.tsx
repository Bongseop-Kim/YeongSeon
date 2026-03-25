import { motion } from "motion/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui-extended/button";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import { REFORM_CONTENT } from "@/features/home/constants/HOME_CONTENT";
import {
  fadeUpVariants,
  homeViewport,
  staggerContainerVariants,
} from "@/features/home/components/home-motion";
import { padZero } from "@/lib/utils";

export const EsReformHighlight = () => {
  return (
    <section className="bg-white py-20 lg:py-28">
      <HomeSectionContainer className="grid gap-10 lg:grid-cols-[minmax(280px,0.74fr)_minmax(0,1.26fr)] lg:items-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={homeViewport}
          variants={staggerContainerVariants}
          className="lg:pr-8"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
            Most Requested
          </p>
          <motion.h2
            variants={fadeUpVariants}
            className="font-display mt-4 max-w-md text-3xl font-bold leading-[0.97] tracking-[-0.035em] text-brand-heading lg:text-[4.1rem]"
          >
            {REFORM_CONTENT.headline}
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mt-5 max-w-md text-base leading-relaxed text-zinc-600"
          >
            {REFORM_CONTENT.subCopy}
          </motion.p>

          <motion.div
            variants={staggerContainerVariants}
            className="mt-8 grid gap-0 border-y border-black/6"
          >
            {REFORM_CONTENT.steps.map((step, index) => (
              <motion.div
                key={step}
                variants={fadeUpVariants}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 py-4 text-brand-heading"
              >
                <span className="font-mono text-xs tracking-[0.3em] text-brand-heading/35">
                  {padZero(index + 1)}
                </span>
                <span className="text-sm font-medium tracking-[-0.03em] lg:text-base">
                  {step}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeUpVariants}>
            <Button
              asChild
              size="lg"
              className="mt-8 rounded-[var(--radius-pill)] bg-brand-surface px-7 text-white hover:bg-brand-ink"
            >
              <Link to={REFORM_CONTENT.cta.href}>
                {REFORM_CONTENT.cta.label}
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={homeViewport}
          variants={fadeUpVariants}
          className="relative overflow-hidden rounded-[var(--radius-showcase-panel)] bg-[#f3efe7]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/2 hidden w-px bg-black/8 lg:block" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/6 to-transparent" />
          </div>
          <div className="grid lg:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[420px] overflow-hidden border-b border-black/6 lg:border-b-0 lg:border-r lg:border-black/6"
            >
              <motion.img
                src="/images/detail/tie3.png"
                alt="보내주신 수동 넥타이"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/18 to-transparent" />
              <div className="absolute left-5 top-5 z-10 lg:left-6 lg:top-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/72">
                  Before
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-20 text-white lg:px-6 lg:pb-6">
                <p className="text-lg font-semibold tracking-[-0.03em]">
                  수동 넥타이
                </p>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-white/72">
                  기존 매듭 구조와 착용 습관을 기준점으로 남깁니다.
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[420px] overflow-hidden bg-brand-surface"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(215,178,77,0.18),transparent_32%),linear-gradient(180deg,rgba(19,22,33,0.08),rgba(19,22,33,0.76))]" />
              <motion.img
                src="/images/item/tie10.png"
                alt="자동 넥타이로 전환된 결과"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute left-5 top-5 z-10 lg:left-6 lg:top-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-gold">
                  After
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-brand-surface-strong via-brand-surface-strong/68 to-transparent px-5 pb-5 pt-20 text-brand-paper lg:px-6 lg:pb-6">
                <p className="text-lg font-semibold tracking-[-0.03em]">
                  자동 넥타이 구조로 전환
                </p>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-brand-paper/74">
                  같은 넥타이를 더 빠르고 일정한 형태로 착용할 수 있게 다시
                  설계합니다.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </HomeSectionContainer>
    </section>
  );
};
