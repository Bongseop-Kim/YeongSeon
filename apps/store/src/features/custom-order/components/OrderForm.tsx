import type { Control, UseFormWatch } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import type { OrderOptions } from "@/features/custom-order/types/order";
import { FabricSection } from "./FabricSection";
import { ProductionSection } from "./ProductionSection";
import { LabelSection } from "./LabelSection";
import { OrderInfoSection } from "./OrderInfoSection";
import { Card, CardContent } from "@/components/ui/card";
import type { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";

type ImageUploadHook = ReturnType<typeof useImageUpload>;

interface OrderFormProps {
  control: Control<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
  imageUpload: ImageUploadHook;
}

const OrderForm = ({ control, watch, imageUpload }: OrderFormProps) => {
  return (
    <Card>
      <CardContent className="space-y-4">
        <FabricSection control={control} watch={watch} />

        <Separator />

        <ProductionSection control={control} />

        <Separator />

        <LabelSection control={control} />

        <Separator />

        <OrderInfoSection control={control} imageUpload={imageUpload} />
      </CardContent>
    </Card>
  );
};

export default OrderForm;
