import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  showPrice?: boolean;
  totalPrice?: number;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  showPrice = false,
  totalPrice,
  className = "",
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (!max || value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center border rounded-sm">
        <Button
          variant="none"
          size="icon"
          className="h-8 w-8 bg-white border-r border-solid"
          onClick={handleDecrease}
          disabled={value <= min}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-12 text-center font-medium">{value}</span>
        <Button
          variant="none"
          size="icon"
          className="h-8 w-8 bg-white border-l border-solid"
          onClick={handleIncrease}
          disabled={max !== undefined && value >= max}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {showPrice && totalPrice !== undefined && (
        <span className="text-sm font-medium">
          {totalPrice.toLocaleString()}원
        </span>
      )}
    </div>
  );
}
