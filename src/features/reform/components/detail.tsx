import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { XIcon } from "lucide-react";
import {
  BANNER_IMAGES,
  FEATURES,
  HEIGHT_GUIDE,
  TARGET_CUSTOMERS,
  TESTIMONIALS,
} from "../constants/DETAIL";

export const Detail = () => {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-zinc-700 text-zinc-50 py-28">
        <h1 className="text-xl md:text-2xl font-bold mb-12 text-center">
          30년 넥타이 장인이 직접 만들어요
        </h1>

        <div className="relative">
          <p className="absolute right-4 bottom-[16%] z-0 text-6xl text-brand-yellow">
            Premium
          </p>
          <p className="absolute left-4 bottom-1/3 z-20 text-6xl text-brand-yellow">
            Craftsmanship
          </p>
          <p className="absolute left-4 top-[12.5%] z-0 text-6xl text-brand-yellow">
            Heritage
          </p>

          <img
            src="/images/detail/fabric.png"
            alt="hero"
            className="w-2/3 h-full relative z-10 mx-auto"
            style={{
              maskImage: "url('/images/detail/tie.svg')",
              WebkitMaskImage: "url('/images/detail/tie.svg')",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-12">
          <div className="text-center">
            <p className="text-xl md:text-2xl mb-4 flex justify-center items-center gap-1">
              매일 아침 3분이{" "}
              <span className="text-brand-yellow font-bold text-2xl">
                5초로
              </span>
              줄어들어요
            </p>
            <p className="text-lg mb-8 text-zinc-50">
              넥타이 못 매도 괜찮아요. 5초면 완벽하게 끝나거든요
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="text-zinc-50 border-white">
                30년 장인 기술
              </Badge>
              <Badge variant="outline" className="text-zinc-50 border-white">
                3개월 무료 A/S
              </Badge>
            </div>
          </div>
        </div>

        <div className="overflow-hidden max-w-6xl mx-auto mt-12">
          <div className="flex animate-scroll gap-4">
            {BANNER_IMAGES.map((image, index) => (
              <img
                key={index}
                src={image.src}
                alt={image.alt}
                className="rounded-md w-1/3 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Service Introduction */}
      <section className="py-16 bg-white">
        <div className="gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center">
              매일 아침이 지겹나요?
            </h2>

            <div className="flex flex-col items-center gap-4">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-4 w-5/6">
                  <div className="bg-zinc-200 rounded-full p-1">
                    <XIcon className="w-3 h-3 text-zinc-700" />
                  </div>
                  <div>
                    <div className="font-semibold">{feature.title}</div>
                    <div className="text-sm text-gray-600">
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="py-16 bg-zinc-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 w-5/6 mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              넥타이 전문 공장에서 직접 하는 전문 수선
            </h2>
            <p className="text-lg text-gray-700">
              30년 전문성으로 시중 어디에서도 찾을 수 없는 품질을 제공합니다
            </p>
          </div>

          <video
            src="/images/detail/video1.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-6xl mx-auto mt-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              이런 분들이 주로 찾아주세요
            </h2>
            <p className="text-lg text-gray-700">
              혹시 여러분도 이런 고민 있으신가요?
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {TARGET_CUSTOMERS.map((customer, index) => (
              <div key={index} className="text-center">
                <div className="p-6">
                  <h3 className="font-bold mb-2">{customer.title}</h3>
                  <p className="text-sm text-gray-600">
                    {customer.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-700 p-8">
            <h3 className="text-xl font-bold mb-6 text-center text-zinc-50">
              실제 주문 고객 현황
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-yellow">40%</div>
                <div className="text-sm text-zinc-50">학생 (해외, 국내)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-yellow">20%</div>
                <div className="text-sm text-zinc-50">기업 단체</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-yellow">35%</div>
                <div className="text-sm text-zinc-50">직장인</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-yellow">5%</div>
                <div className="text-sm text-zinc-50">기타</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              어떻게 진행되는지 궁금하시죠?
            </h2>
            <p className="text-lg text-gray-700">
              생각보다 간단해요. 4단계면 끝이에요
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="bg-zinc-600 text-zinc-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-bold mb-2">키만 알려주세요</h3>
              <p className="text-sm text-gray-600">
                키에 맞는 길이로 딱 맞게 만들어드려요
              </p>
            </div>
            <div className="text-center">
              <div className="bg-zinc-600 text-zinc-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-bold mb-2">넥타이만 보내주세요</h3>
              <p className="text-sm text-gray-600">
                수거 신청 또는 택배로 보내시면 돼요
              </p>
            </div>
            <div className="text-center">
              <div className="bg-zinc-600 text-zinc-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-bold mb-2">장인이 손수 작업해요</h3>
              <p className="text-sm text-gray-600">
                30년 경력으로 꼼꼼하게 (10일 정도 걸려요)
              </p>
            </div>
            <div className="text-center">
              <div className="bg-zinc-600 text-zinc-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-bold mb-2">집까지 배송해드려요</h3>
              <p className="text-sm text-gray-600">
                5초 넥타이로 변신해서 도착해요
              </p>
            </div>
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

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">실제 사용자 생생 후기</h2>
            <p className="text-lg text-gray-700">
              고객님들의 만족도 100% 후기입니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <Badge className="w-fit">{testimonial.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <p className="text-sm text-gray-500">
                    - {testimonial.author}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br bg-zinc-700 text-zinc-50">
        <div className="max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Heritage</h2>
          <div className="relative">
            <img
              src="/images/detail/product1.png"
              alt="product1"
              className="w-full object-cover rounded-lg"
            />

            {/* 그림자 오버레이 */}
            <div className="absolute inset-0 bg-black opacity-50"></div>

            {/* 텍스트 오버레이 */}
            <div className="absolute inset-0 p-8">
              <div className="h-full flex flex-col justify-between">
                {/* 상단 좌측 */}
                <div className="flex justify-start">
                  <div className="text-white">
                    <div className="text-5xl md:text-6xl font-bold mb-1">
                      30년째
                    </div>
                    <div className="text-lg md:text-xl mb-2">오직 넥타이만</div>
                  </div>
                </div>

                {/* 중앙 우측 */}
                <div className="flex justify-end items-center">
                  <div className="text-white text-right">
                    <div className="text-4xl md:text-5xl font-bold mb-1">
                      키만 말하면
                    </div>
                    <div className="text-lg md:text-xl mb-2">딱 맞게</div>
                  </div>
                </div>

                {/* 하단 중앙 */}
                <div className="flex justify-center">
                  <div className="text-white text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1 text-brand-yellow">
                      5초면 끝
                    </div>
                    <div className="text-lg md:text-xl mb-2">
                      매일 아침이 편해져요
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-zinc-50 text-lg px-12 py-4 font-semibold">
            한번 체험해보실래요?
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm ">
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
