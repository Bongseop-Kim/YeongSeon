import { useState } from "react";
import type { ProductOption } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types";

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
          ? { ...s, quantity: Math.max(1, s.quantity + delta) }
          : s
      )
    );
  };

  const handleUpdateBaseQuantity = (delta: number) => {
    setBaseQuantity((prev) => Math.max(1, prev + delta));
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
