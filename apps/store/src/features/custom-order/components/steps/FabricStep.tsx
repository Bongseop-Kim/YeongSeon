import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

interface FabricCard {
  fabricType: "POLY" | "SILK";
  designType: "PRINTING" | "YARN_DYED";
  label: string;
  description: string;
}

const FABRIC_CARDS: FabricCard[] = [
  {
    fabricType: "POLY",
    designType: "PRINTING",
    label: "폴리 · 날염",
    description: "가장 경제적인 선택. 선명한 프린팅 가능",
  },
  {
    fabricType: "POLY",
    designType: "YARN_DYED",
    label: "폴리 · 선염",
    description: "실로 짜는 고급스러운 패턴",
  },
  {
    fabricType: "SILK",
    designType: "PRINTING",
    label: "실크 · 날염",
    description: "실크의 광택과 선명한 프린팅",
  },
  {
    fabricType: "SILK",
    designType: "YARN_DYED",
    label: "실크 · 선염",
    description: "최고급 소재와 전통 직조 기법",
  },
];

export const FabricStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const currentFabricType = watch("fabricType");
  const currentDesignType = watch("designType");

  const handleCardClick = (card: FabricCard) => {
    setValue("fabricType", card.fabricType);
    setValue("designType", card.designType);
  };

  const isSelected = (card: FabricCard) =>
    currentFabricType === card.fabricType &&
    currentDesignType === card.designType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          원단을 선택해주세요
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          소재와 디자인 방식을 함께 선택합니다
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FABRIC_CARDS.map((card) => (
          <button
            key={`${card.fabricType}-${card.designType}`}
            type="button"
            onClick={() => handleCardClick(card)}
            className={cn(
              "text-left p-5 rounded-lg border-2 transition-all",
              isSelected(card)
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 hover:border-zinc-400 bg-white"
            )}
          >
            <div className="font-medium text-zinc-900">{card.label}</div>
            <div className="text-sm text-zinc-500 mt-1">
              {card.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
