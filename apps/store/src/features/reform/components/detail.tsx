import { useState } from "react";
import { XIcon } from "lucide-react";

import { HEIGHT_GUIDE } from "@/constants/HEIGHT_GUIDE";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  FEATURES,
  TARGET_CUSTOMERS,
  TESTIMONIALS,
  getShuffledBannerImages,
} from "@/features/reform/constants/DETAIL";

export const Detail = () => {
  const { isMobile } = useBreakpoint();
  const [bannerImages] = useState(getShuffledBannerImages);

  return (
    <div className="bg-background text-foreground">
      <section className="overflow-hidden bg-brand-surface text-brand-paper">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
            Heritage Repair
          </p>
          <h1 className="mt-6 text-center text-3xl font-bold md:text-4xl">
            30년 넥타이 장인이 직접 만들어요
          </h1>

          <div className="relative mt-14">
            <p className="absolute bottom-[16%] right-4 z-0 text-4xl text-brand-gold/60 md:text-6xl">
              Premium
            </p>
            <p className="absolute left-4 bottom-1/3 z-20 text-4xl text-brand-gold/85 md:text-6xl">
              Craftsmanship
            </p>
            <p className="absolute left-4 top-[12.5%] z-0 text-4xl text-brand-gold/60 md:text-6xl">
              Heritage
            </p>

            <img
              src="/images/detail/fabric.png"
              alt="넥타이 원단"
              className="relative z-10 mx-auto h-full w-2/3"
              style={{
                maskImage: "url('/images/detail/tie.svg')",
                WebkitMaskImage: "url('/images/detail/tie.svg')",
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
              }}
            />
          </div>

          <div className="mt-12 text-center">
            <p className="flex items-center justify-center gap-1 text-xl md:text-2xl">
              매일 아침 3분이{" "}
              <span className="text-2xl font-bold text-brand-gold">5초로</span>
              줄어들어요
            </p>
            <p className="mt-4 text-lg text-brand-paper/78">
              넥타이 못 매도 괜찮아요. 5초면 완벽하게 끝나거든요
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/5 text-brand-paper"
              >
                30년 장인 기술
              </Badge>
              <Badge
                variant="outline"
                className="border-white/20 bg-white/5 text-brand-paper"
              >
                3개월 무료 A/S
              </Badge>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-6xl overflow-hidden">
            <div className="flex animate-scroll gap-4">
              {bannerImages.map((image, index) => (
                <img
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  className="w-1/3 flex-shrink-0 rounded-xl border border-white/10"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-center text-3xl font-bold">
            매일 아침이 지겹나요?
          </h2>

          <div className="flex flex-col items-center gap-4">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="flex w-full max-w-4xl items-start gap-4 rounded-2xl border border-border/70 bg-surface px-5 py-4"
              >
                <div className="rounded-full bg-surface-muted p-1.5">
                  <XIcon className="h-3 w-3 text-foreground-subtle" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {feature.title}
                  </div>
                  <div className="text-sm text-foreground-muted">
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 w-5/6 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              넥타이 전문 공장에서 직접 하는 전문 수선
            </h2>
            <p className="text-lg text-foreground-subtle">
              30년 전문성으로 시중 어디에서도 찾을 수 없는 품질을 제공합니다
            </p>
          </div>

          <video
            src="/images/detail/video1.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full rounded-[1.75rem] border border-border/70 object-cover shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]"
          />
        </div>

        <div className="mx-auto mt-12 max-w-6xl px-4">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold">
              이런 분들이 주로 찾아주세요
            </h2>
            <p className="text-lg text-foreground-subtle">
              혹시 여러분도 이런 고민 있으신가요?
            </p>
          </div>

          <div
            className={`mb-12 mt-10 grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}
          >
            {TARGET_CUSTOMERS.map((customer, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/70 bg-background p-6 text-center"
              >
                <h3 className="mb-2 font-bold text-foreground">
                  {customer.title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {customer.description}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] bg-brand-surface px-6 py-8 text-brand-paper">
            <h3 className="mb-6 text-center text-xl font-bold">
              실제 주문 고객 현황
            </h3>
            <div
              className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-4`}
            >
              {[
                ["40%", "학생 (해외, 국내)"],
                ["20%", "기업 단체"],
                ["35%", "직장인"],
                ["5%", "기타"],
              ].map(([value, label]) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-brand-gold">
                    {value}
                  </div>
                  <div className="mt-1 text-sm text-brand-paper/78">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold">
              어떻게 진행되는지 궁금하시죠?
            </h2>
            <p className="text-lg text-foreground-subtle">
              생각보다 간단해요. 4단계면 끝이에요
            </p>
          </div>

          <div
            className={`mb-12 mt-10 grid ${isMobile ? "grid-cols-1" : "grid-cols-4"} gap-6`}
          >
            {[
              ["1", "키만 알려주세요", "키에 맞는 길이로 딱 맞게 만들어드려요"],
              [
                "2",
                "넥타이만 보내주세요",
                "수거 신청 또는 택배로 보내시면 돼요",
              ],
              [
                "3",
                "장인이 손수 작업해요",
                "30년 경력으로 꼼꼼하게 (10일 정도 걸려요)",
              ],
              ["4", "집까지 배송해드려요", "5초 넥타이로 변신해서 도착해요"],
            ].map(([step, title, description]) => (
              <div
                key={step}
                className="rounded-2xl border border-border/70 bg-surface p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-xl font-bold text-brand-paper">
                  {step}
                </div>
                <h3 className="mb-2 font-bold text-foreground">{title}</h3>
                <p className="text-sm text-foreground-muted">{description}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                내게 맞는 넥타이 길이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                headers={["키", "권장 길이"]}
                data={HEIGHT_GUIDE.map((guide) => ({
                  키: guide.height,
                  "권장 길이": guide.length,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold">실제 사용자 생생 후기</h2>
            <p className="text-lg text-foreground-subtle">
              고객님들의 만족도 100% 후기입니다
            </p>
          </div>

          <div
            className={`mt-10 grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-6`}
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <Badge className="w-fit">{testimonial.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-foreground-subtle">
                    "{testimonial.content}"
                  </p>
                  <p className="text-sm text-foreground-muted">
                    - {testimonial.author}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-surface py-20 text-brand-paper">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold">Heritage</h2>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10">
            <img
              src="/images/detail/product1.png"
              alt="수선 넥타이"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 p-8">
              <div className="flex h-full flex-col justify-between">
                <div className="flex justify-start">
                  <div className="text-left text-white">
                    <div className="mb-1 text-5xl font-bold md:text-6xl">
                      30년째
                    </div>
                    <div className="text-lg md:text-xl">오직 넥타이만</div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="text-right text-white">
                    <div className="mb-1 text-4xl font-bold md:text-5xl">
                      키만 말하면
                    </div>
                    <div className="text-lg md:text-xl">딱 맞게</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="text-center text-white">
                    <div className="mb-1 text-4xl font-bold text-brand-gold md:text-5xl">
                      5초면 끝
                    </div>
                    <div className="text-lg md:text-xl">
                      매일 아침이 편해져요
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-12 py-4 text-lg font-semibold text-brand-paper">
            한번 체험해보실래요?
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-brand-paper/80">
              <span>✓ 전국 배송 가능</span>
              <span>✓ 무상 A/S</span>
              <span>✓ 대량 주문 환영</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
