import { useState } from "react";
import type { ProductOption } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";
import { toast } from "@/shared/lib/toast";

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
    let isStockExceeded = false;
    const nextSelectedOptions = selectedOptions.map((s) => {
      if (s.option.id !== optionId) return s;

      const nextQuantity = Math.max(1, s.quantity + delta);
      if (s.option.stock != null && nextQuantity > s.option.stock) {
        isStockExceeded = true;
        return { ...s, quantity: Math.max(1, s.option.stock) };
      }

      return { ...s, quantity: nextQuantity };
    });

    setSelectedOptions(nextSelectedOptions);

    if (isStockExceeded) {
      toast.warning("재고가 부족합니다.");
    }
  };

  const handleUpdateBaseQuantity = (
    delta: number,
    maxStock?: number | null,
  ) => {
    const nextQuantity = Math.max(1, baseQuantity + delta);
    const isStockExceeded = maxStock != null && nextQuantity > maxStock;
    const clampedQuantity = isStockExceeded
      ? Math.max(1, maxStock)
      : nextQuantity;

    setBaseQuantity(clampedQuantity);

    if (isStockExceeded) {
      toast.warning("재고가 부족합니다.");
    }
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
