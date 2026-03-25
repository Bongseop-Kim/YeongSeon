import {
  MANUFACTURING_CONTENT,
  MANUFACTURING_STEPS,
} from "@/features/home/constants/HOME_CONTENT";
import { HomeSectionContainer } from "@/features/home/components/home-section-container";
import { padZero } from "@/lib/utils";

export const EsManufacturing = () => {
  return (
    <section
      id="manufacturing"
      className="bg-brand-surface py-20 text-brand-paper lg:py-28"
    >
      <HomeSectionContainer>
        <div className="grid gap-12 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
              Manufacturing
            </p>
            <h2 className="font-display mt-4 max-w-md text-4xl font-bold leading-[0.93] tracking-[-0.035em] lg:text-[4.35rem]">
              {MANUFACTURING_CONTENT.headline}
            </h2>
            <p className="mt-5 max-w-sm whitespace-pre-line text-sm leading-relaxed text-brand-paper/62 lg:text-base">
              {MANUFACTURING_CONTENT.subCopy.join("\n")}
            </p>
            <p className="mt-10 max-w-xs border-t border-white/8 pt-5 text-xs uppercase tracking-[0.3em] text-brand-paper/42">
              Design, order, payment, and production read as one continuous
              flow.
            </p>
          </div>

          <div className="grid gap-0 border-t border-white/8">
            {MANUFACTURING_STEPS.map((step) => (
              <div
                key={step.step}
                className="group grid gap-6 border-b border-white/8 py-8 lg:grid-cols-[auto_minmax(0,0.78fr)_minmax(240px,0.68fr)] lg:items-end lg:gap-8"
              >
                <p className="font-display text-[3.4rem] leading-none tracking-[-0.06em] text-brand-paper/22 transition-colors duration-300 group-hover:text-brand-accent/82 lg:text-[5.5rem]">
                  {padZero(step.step)}
                </p>

                <div className="max-w-xl">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                    Step {padZero(step.step)}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-paper lg:text-[2.1rem]">
                    {step.label}
                  </p>
                </div>

                <div className="grid gap-4 lg:justify-items-end">
                  <p className="max-w-[22rem] text-sm leading-relaxed text-brand-paper/56 lg:text-right">
                    {step.description}
                  </p>
                  <div className="relative min-h-[180px] overflow-hidden rounded-[18px] bg-white/4 lg:min-h-[220px] lg:w-[18rem]">
                    <img
                      src="/images/detail/product1.png"
                      alt="넥타이 설계와 샘플 디테일"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,30,0.04),rgba(16,18,30,0.5))]" />
                    <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16">
                      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brand-accent">
                        Online order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HomeSectionContainer>
    </section>
  );
};
