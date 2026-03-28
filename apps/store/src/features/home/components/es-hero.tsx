import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui-extended/button";
import { HERO_CONTENT } from "@/features/home/constants/HOME_CONTENT";
import { scrollToSection } from "@/features/home/utils/scroll-to-section";
import { useBreakpoint } from "@/providers/breakpoint-provider";

const HERO_VARIANTS = [
  {
    key: "blue",
    name: "Cobalt Motion",
    textureSrc: "/images/home/blue.png",
    tieSrc: "/images/home/blue-mask.png",
    tieAlt: "코발트 블루 패턴 자동 넥타이",
    accent: "text-sky-300",
    glowClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(89,165,255,0.32),transparent_0%,transparent_58%)]",
    orbClass:
      "bg-[radial-gradient(circle,rgba(67,140,255,0.24),rgba(67,140,255,0)_68%)]",
  },
  {
    key: "red",
    name: "Rouge Precision",
    textureSrc: "/images/home/red.png",
    tieSrc: "/images/home/red-mask.png",
    tieAlt: "루즈 레드 패턴 자동 넥타이",
    accent: "text-rose-300",
    glowClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(255,116,134,0.28),transparent_0%,transparent_58%)]",
    orbClass:
      "bg-[radial-gradient(circle,rgba(255,92,92,0.2),rgba(255,92,92,0)_68%)]",
  },
  {
    key: "green",
    name: "Verdant Fold",
    textureSrc: "/images/home/green.png",
    tieSrc: "/images/home/green-mask.png",
    tieAlt: "버던트 그린 패턴 자동 넥타이",
    accent: "text-emerald-300",
    glowClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(112,225,173,0.26),transparent_0%,transparent_58%)]",
    orbClass:
      "bg-[radial-gradient(circle,rgba(65,201,149,0.2),rgba(65,201,149,0)_68%)]",
  },
] as const;

const MOBILE_SIGNALS = ["딤플 몰드 자체 설계"] as const;
const DESKTOP_SIGNALS = [
  "딤플 몰드 자체 설계",
  "스포데라토·세븐폴드 봉제",
] as const;

export const EsHero = () => {
  const { isMobile } = useBreakpoint();
  const heroRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const heroSignals = isMobile ? MOBILE_SIGNALS : DESKTOP_SIGNALS;
  const activeVariant = HERO_VARIANTS[activeIndex];
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, shouldReduceMotion ? 0 : 80],
  );
  const mediaY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, shouldReduceMotion ? 0 : 120],
  );
  const mediaScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, shouldReduceMotion ? 1 : 0.92],
  );
  const mediaOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.45]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % HERO_VARIANTS.length);
    }, 3200);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <motion.section
      ref={heroRef}
      className="relative overflow-hidden bg-brand-ink text-brand-paper"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_30%),radial-gradient(circle_at_72%_18%,rgba(79,195,247,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />
      <div className="absolute inset-y-0 right-[-12%] hidden w-[44%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_62%)] blur-3xl lg:block" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[image:var(--gradient-brand-hero-bottom)] lg:h-52" />
      <div className="mx-auto flex min-h-[100svh] max-w-[1600px] flex-col px-[var(--space-showcase-section-x)] pb-10 pt-20 lg:min-h-[100svh] lg:flex-row lg:items-center lg:px-[var(--space-showcase-section-x-lg)] lg:pb-20 lg:pt-24">
        <motion.div
          style={{ y: contentY }}
          className="relative z-10 flex w-full flex-col justify-center lg:w-[41%]"
        >
          {!isMobile ? (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 text-xs font-medium uppercase tracking-[0.38em] text-brand-gold"
            >
              ESSE SION
            </motion.p>
          ) : null}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.08, delayChildren: 0.08 },
              },
            }}
            className="font-display text-[2.85rem] font-extrabold leading-[0.92] tracking-[-0.03em] text-brand-paper md:text-5xl lg:text-6xl xl:text-7xl"
          >
            {HERO_CONTENT.headline.map((line) => (
              <motion.span
                key={line}
                className="block"
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
              >
                {line}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.72,
              delay: 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-5 max-w-[19rem] whitespace-pre-line text-sm leading-relaxed text-brand-paper/70 lg:mt-6 lg:max-w-md lg:text-lg"
          >
            {HERO_CONTENT.subCopy.join("\n")}
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.08, delayChildren: 0.3 },
              },
            }}
            className="mt-6 flex flex-wrap gap-3 text-sm text-brand-paper/72 lg:mt-8"
          >
            {heroSignals.map((signal) => (
              <motion.span
                key={signal}
                className="rounded-[var(--radius-pill)] border border-white/8 bg-white/5 px-4 py-2 backdrop-blur-sm"
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
              >
                {signal}
              </motion.span>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.72,
              delay: 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-10"
          >
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
          </motion.div>
        </motion.div>

        <motion.div
          style={{
            y: mediaY,
            scale: mediaScale,
            opacity: mediaOpacity,
          }}
          className="relative mt-8 w-full lg:mt-0 lg:ml-auto lg:w-[53%]"
        >
          <div className="group relative min-h-[420px] overflow-hidden rounded-[var(--radius-showcase-panel)] border border-white/6 [background-image:var(--gradient-brand-hero-stage)] shadow-[0_40px_120px_rgba(0,0,0,0.35)] lg:min-h-[700px]">
            <div className="absolute inset-0 [background-image:var(--gradient-brand-hero-overlay)]" />
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.03),transparent_38%,rgba(255,255,255,0.02)_100%)]" />
            <div className="absolute inset-x-[16%] top-[8%] h-[42%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),rgba(255,255,255,0)_68%)] blur-3xl" />

            {!isMobile ? (
              <LayoutGroup>
                <div className="absolute left-5 top-5 z-20 flex gap-3 lg:left-8 lg:top-8 lg:flex-col">
                  {HERO_VARIANTS.map((variant, index) => {
                    const isActive = index === activeIndex;

                    return (
                      <motion.button
                        key={variant.key}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        whileHover={shouldReduceMotion ? undefined : { x: 6 }}
                        className={`relative overflow-hidden rounded-[var(--radius-showcase-card)] border p-2 backdrop-blur-md transition-colors duration-500 ${
                          isActive
                            ? "border-white/18 bg-white/8 shadow-[0_22px_48px_rgba(0,0,0,0.26)]"
                            : "border-white/6 bg-black/14 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {isActive ? (
                          <motion.div
                            layoutId="hero-variant-frame"
                            className="absolute inset-0 rounded-[var(--radius-showcase-card)] border border-white/16"
                          />
                        ) : null}
                        <img
                          src={variant.textureSrc}
                          alt={`${variant.name} 원단 질감`}
                          className={`h-24 w-20 rounded-[calc(var(--radius-showcase-card)-0.35rem)] object-cover transition-all duration-700 lg:h-34 lg:w-28 ${
                            isActive ? "scale-100" : "scale-[0.96]"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>
            ) : null}

            <AnimatePresence initial={false}>
              <motion.div
                key={activeVariant.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { scale: [0.96, 1.04, 0.96], opacity: [0.3, 0.58, 0.3] }
                  }
                  transition={{
                    duration: 7,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className={`absolute right-[-4%] top-[8%] h-[56%] w-[68%] rounded-full blur-3xl ${activeVariant.glowClass}`}
                />
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { y: [0, -16, 0], scale: [1, 1.04, 1] }
                  }
                  transition={{
                    duration: 8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className={`absolute right-[8%] top-[12%] h-32 w-32 rounded-full blur-2xl lg:h-44 lg:w-44 ${activeVariant.orbClass}`}
                />
                <motion.div
                  initial={{ opacity: 0, y: 56 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -56 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 bottom-10 z-[1] mx-auto h-[82%] lg:bottom-18 lg:h-[84%]"
                >
                  <motion.img
                    key={activeVariant.tieSrc}
                    src={activeVariant.tieSrc}
                    alt={activeVariant.tieAlt}
                    animate={
                      shouldReduceMotion
                        ? { scale: 1, y: 0 }
                        : { scale: 1, y: [0, -10, 0] }
                    }
                    transition={
                      shouldReduceMotion
                        ? { duration: 0.2 }
                        : {
                            y: {
                              duration: 7.2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            },
                            scale: { duration: 0.2 },
                          }
                    }
                    className="h-full w-full object-contain drop-shadow-[0_38px_42px_rgba(0,0,0,0.45)]"
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-brand-surface-strong via-brand-surface-strong/82 to-transparent px-[var(--space-showcase-panel-x)] pb-5 pt-24 lg:px-8 lg:pb-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                    Precision Crafted
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activeVariant.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className={`mt-2 text-sm font-medium tracking-[0.18em] uppercase ${activeVariant.accent}`}
                    >
                      {activeVariant.name}
                    </motion.p>
                  </AnimatePresence>
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
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 hidden justify-center lg:flex">
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [0, 10, 0], opacity: [0.4, 0.9, 0.4] }
          }
          transition={{
            duration: 1.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <ChevronDown className="size-6 text-white/70" />
        </motion.div>
      </div>
    </motion.section>
  );
};
