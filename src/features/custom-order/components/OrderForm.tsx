import type { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import type { OrderOptions } from "../types/order";
import { FabricSection } from "./FabricSection";
import { ProductionSection } from "./ProductionSection";
import { LabelSection } from "./LabelSection";
import { OrderInfoSection } from "./OrderInfoSection";

interface OrderFormProps {
  control: Control<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
  setValue: UseFormSetValue<OrderOptions>;
}

const OrderForm = ({ control, watch, setValue }: OrderFormProps) => {
  return (
    <div className="space-y-8">
      <FabricSection control={control} watch={watch} />

      <Separator />

      <ProductionSection control={control} />

      <Separator />

      <LabelSection control={control} />

      <Separator />

      <OrderInfoSection control={control} setValue={setValue} watch={watch} />
    </div>
  );
};

export default OrderForm;
