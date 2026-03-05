import { useState } from "react";
import type { ProductOption } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";
import { toast } from "@/lib/toast";

export function useSelectedOptions() {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [baseQuantity, setBaseQuantity] = useState(1);

  const handleSelectOption = (option: ProductOption) => {
    const exists = selectedOptions.find((s) => s.option.id === option.id);
    if (!exists) {
      setSelectedOptions((prev) => [...prev, { option, quantity: 1 }]);
    }
  };

  const handleRemoveOption = (optionId: string) => {
    setSelectedOptions((prev) => prev.filter((s) => s.option.id !== optionId));
  };

  const handleUpdateQuantity = (optionId: string, delta: number) => {
    setSelectedOptions((prev) =>
      prev.map((s) =>
        s.option.id === optionId
          ? (() => {
              const nextQuantity = Math.max(1, s.quantity + delta);

              if (s.option.stock != null && nextQuantity > s.option.stock) {
                toast.warning("재고가 부족합니다.");
                return { ...s, quantity: s.option.stock };
              }

              return { ...s, quantity: nextQuantity };
            })()
          : s
      )
    );
  };

  const handleUpdateBaseQuantity = (delta: number, maxStock?: number | null) => {
    setBaseQuantity((prev) => {
      const nextQuantity = Math.max(1, prev + delta);

      if (maxStock != null && nextQuantity > maxStock) {
        toast.warning("재고가 부족합니다.");
        return maxStock;
      }

      return nextQuantity;
    });
  };

  const resetOptions = () => {
    setSelectedOptions([]);
    setBaseQuantity(1);
  };

  return {
    selectedOptions,
    baseQuantity,
    handleSelectOption,
    handleRemoveOption,
    handleUpdateQuantity,
    handleUpdateBaseQuantity,
    resetOptions,
  };
}
