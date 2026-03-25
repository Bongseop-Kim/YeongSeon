import { useEffect, useState } from "react";
import { Button } from "@/components/ui-extended/button";
import { Input } from "@/components/ui-extended/input";
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
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleDecrease = () => {
    if (value > min) {
      const next = value - 1;
      onChange(next);
      setInputValue(String(next));
    }
  };

  const handleIncrease = () => {
    if (max === undefined || value < max) {
      const next = value + 1;
      onChange(next);
      setInputValue(String(next));
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
        <Input
          type="number"
          value={inputValue}
          step={1}
          min={min}
          max={max}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            const parsed = parseInt(inputValue, 10);
            const fallback = Number.isNaN(parsed) ? min : parsed;
            const clamped =
              max !== undefined
                ? Math.min(Math.max(fallback, min), max)
                : Math.max(fallback, min);

            onChange(clamped);
            setInputValue(String(clamped));
          }}
          className="w-12 text-center font-medium shadow-none rounded-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
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
