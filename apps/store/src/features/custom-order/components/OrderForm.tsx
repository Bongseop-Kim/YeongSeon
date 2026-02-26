import type { Control, UseFormWatch } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import type { OrderOptions } from "@/features/custom-order/types/order";
import { FabricSection } from "./FabricSection";
import { ProductionSection } from "./ProductionSection";
import { LabelSection } from "./LabelSection";
import { OrderInfoSection } from "./OrderInfoSection";
import { Card, CardContent } from "@/components/ui/card";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";

interface OrderFormProps<T extends OrderOptions = OrderOptions> {
  control: Control<T>;
  watch: UseFormWatch<T>;
  imageUpload: ImageUploadHook;
}

const OrderForm = <T extends OrderOptions>({
  control: formControl,
  watch: formWatch,
  imageUpload,
}: OrderFormProps<T>) => {
  // Sub-components only access OrderOptions fields; safe narrowing
  const control = formControl as unknown as Control<OrderOptions>;
  const watch = formWatch as unknown as UseFormWatch<OrderOptions>;

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
