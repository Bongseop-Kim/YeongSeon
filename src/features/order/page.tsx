import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import OrderForm from "./components/OrderForm";
import CostBreakdown from "./components/CostBreakdown";
import type { OrderOptions } from "./types/order";

const OrderPage = () => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    // formState: { errors },
  } = useForm<OrderOptions>({
    defaultValues: {
      // 원단 정보
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",
      patternType: "BASIC",

      // 제작 옵션
      tieType: "MANUAL",
      interlining: "POLY",
      interliningThickness: "THICK",
      sizeType: "ADULT",
      tieWidth: 8,

      // 추가 옵션
      triangleStitch: true,
      sideStitch: true,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,

      // 라벨 옵션
      brandLabel: false,
      careLabel: false,

      // 주문 정보
      quantity: 4,
      referenceImages: null,
      additionalNotes: "",
      sample: false,
    },
  });

  const watchedValues = watch();

  const onSubmit = (data: OrderOptions) => {
    console.log("Order submitted:", data);
    // 주문 제출 로직
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Added to cart:", watchedValues);
    // 장바구니 추가 로직
  };

  const handleDirectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Direct order:", watchedValues);
    // 바로 주문 로직
  };

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-6xl mx-auto py-8 px-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽: 주문 폼 */}
              <div className="lg:col-span-2">
                <OrderForm
                  control={control}
                  watch={watch}
                  setValue={setValue}
                />
              </div>

              {/* 오른쪽: 주문 내역 */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  <CostBreakdown options={watchedValues} />

                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={handleAddToCart}
                      size="lg"
                      variant="outline"
                      className="w-full h-12 text-base font-medium"
                    >
                      장바구니 담기
                    </Button>
                    <Button
                      type="button"
                      onClick={handleDirectOrder}
                      size="lg"
                      className="w-full h-12 text-base font-medium bg-stone-900 hover:bg-stone-800"
                    >
                      바로 주문하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default OrderPage;
