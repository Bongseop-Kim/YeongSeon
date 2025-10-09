import { useForm } from "react-hook-form";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import OrderForm from "./components/OrderForm";
import CostBreakdown from "./components/CostBreakdown";
import type { OrderOptions } from "./types/order";
import { Form } from "@/components/ui/form";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { calculateTotalCost } from "./utils/pricing";

const OrderPage = () => {
  const form = useForm<OrderOptions>({
    defaultValues: {
      // 원단 정보
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",

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

  const watchedValues = form.watch();

  const handleDirectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Direct order:", watchedValues);
    // 바로 주문 로직
  };

  const { sewingCost, fabricCost, totalCost } =
    calculateTotalCost(watchedValues);

  return (
    <MainLayout>
      <MainContent className="bg-zinc-100 overflow-visible">
        <Form {...form}>
          <TwoPanelLayout
            leftPanel={
              <OrderForm
                control={form.control}
                watch={form.watch}
                setValue={form.setValue}
              />
            }
            rightPanel={
              <CostBreakdown
                options={watchedValues}
                totalCost={totalCost}
                sewingCost={sewingCost}
                fabricCost={fabricCost}
              />
            }
            button={
              <Button
                type="button"
                onClick={handleDirectOrder}
                size="lg"
                className="w-full"
              >
                {totalCost.toLocaleString()}원 주문하기
              </Button>
            }
          />
        </Form>
      </MainContent>
    </MainLayout>
  );
};

export default OrderPage;
