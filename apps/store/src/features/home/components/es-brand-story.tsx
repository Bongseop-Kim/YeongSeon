import { motion } from "motion/react";

import { BRAND_STORY_CONTENT } from "@/features/home/constants/HOME_CONTENT";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import {
  fadeUpVariants,
  homeViewport,
  staggerContainerVariants,
} from "@/features/home/components/home-motion";

export const EsBrandStory = () => {
  return (
    <section id="brand-story" className="bg-brand-paper-muted py-18 lg:py-24">
      <HomeSectionContainer>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={homeViewport}
          variants={fadeUpVariants}
          className="relative overflow-hidden rounded-[var(--radius-showcase-panel)] bg-white shadow-[0_25px_80px_rgba(16,18,30,0.06)]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-6%] top-[-18%] h-56 w-56 rounded-full bg-brand-accent/8 blur-3xl" />
            <div className="absolute bottom-[-16%] right-[28%] h-64 w-64 rounded-full bg-brand-heading/6 blur-3xl" />
            <div className="absolute inset-y-0 left-[54%] hidden w-px bg-black/6 lg:block" />
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.82fr)]">
            <motion.div
              variants={staggerContainerVariants}
              className="relative flex min-h-[420px] flex-col justify-between px-6 py-7 lg:min-h-[520px] lg:px-8 lg:py-8"
            >
              <div className="flex items-center gap-4">
                <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
                  Workshop Note
                </p>
                <div className="h-px flex-1 bg-black/8" />
              </div>

              <motion.div
                variants={fadeUpVariants}
                className="relative max-w-[36rem] py-10 lg:py-14"
              >
                <span className="pointer-events-none absolute -left-2 -top-1 text-8xl leading-none text-brand-heading/7 lg:text-[7.5rem]">
                  "
                </span>
                <p className="font-display relative whitespace-pre-line pl-5 text-[2rem] font-bold leading-[0.98] tracking-[-0.035em] text-brand-heading lg:pl-8 lg:text-[4.25rem]">
                  {BRAND_STORY_CONTENT.quote}
                </p>
              </motion.div>

              <motion.div
                variants={fadeUpVariants}
                className="max-w-sm border-t border-black/8 pt-5"
              >
                <p className="text-sm leading-relaxed text-brand-heading/68">
                  수치를 만드는 공장이 아니라, 매듭감과 착용감까지 직접 확인하는
                  작은 작업실의 방식으로 접근합니다.
                </p>
              </motion.div>
            </motion.div>

            <div className="grid border-t border-black/6 lg:border-l lg:border-t-0">
              <motion.div
                variants={fadeUpVariants}
                className="relative min-h-[280px] overflow-hidden bg-brand-paper-muted lg:min-h-[360px]"
              >
                <motion.img
                  src="/images/instagram-feed/6.png"
                  alt="작업실 기록"
                  initial={{ scale: 1.08 }}
                  whileInView={{ scale: 1 }}
                  viewport={homeViewport}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-heading/45 via-brand-heading/10 to-transparent" />
              </motion.div>

              <motion.div
                variants={staggerContainerVariants}
                className="grid gap-px bg-black/6 sm:grid-cols-2"
              >
                {BRAND_STORY_CONTENT.stats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    variants={fadeUpVariants}
                    className="bg-brand-paper-muted px-5 py-5 lg:px-6 lg:py-6"
                  >
                    <p className="font-mono text-4xl font-bold text-brand-heading lg:text-[2.75rem]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </HomeSectionContainer>
    </section>
  );
};
