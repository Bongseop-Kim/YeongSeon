import type { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import type { OrderOptions } from "../types/order";
import { FabricSection } from "./FabricSection";
import { ProductionSection } from "./ProductionSection";
import { LabelSection } from "./LabelSection";
import { OrderInfoSection } from "./OrderInfoSection";
import { Card, CardContent } from "@/components/ui/card";

interface OrderFormProps {
  control: Control<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
  setValue: UseFormSetValue<OrderOptions>;
}

const OrderForm = ({ control, watch, setValue }: OrderFormProps) => {
  return (
    <Card>
      <CardContent className="space-y-4">
        <FabricSection control={control} watch={watch} />

        <Separator />

        <ProductionSection control={control} />

        <Separator />

        <LabelSection control={control} />

        <Separator />

        <OrderInfoSection control={control} setValue={setValue} watch={watch} />
      </CardContent>
    </Card>
  );
};

export default OrderForm;
