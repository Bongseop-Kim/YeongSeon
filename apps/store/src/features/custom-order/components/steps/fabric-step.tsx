import { useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";
import { UtilityPagePanel } from "@/shared/composite/utility-page";

interface FabricCard {
  fabricType: "POLY" | "SILK";
  designType: "PRINTING" | "YARN_DYED";
  label: string;
}

const FABRIC_CARDS: FabricCard[] = [
  {
    fabricType: "POLY",
    designType: "PRINTING",
    label: "폴리 · 날염",
  },
  {
    fabricType: "POLY",
    designType: "YARN_DYED",
    label: "폴리 · 선염",
  },
  {
    fabricType: "SILK",
    designType: "PRINTING",
    label: "실크 · 날염",
  },
  {
    fabricType: "SILK",
    designType: "YARN_DYED",
    label: "실크 · 선염",
  },
];

export const FabricStep = () => {
  const { watch, setValue } = useFormContext<QuoteOrderOptions>();
  const currentFabricType = watch("fabricType");
  const currentDesignType = watch("designType");
  const currentValue = `${currentFabricType}-${currentDesignType}`;

  const handleCardClick = (card: FabricCard) => {
    setValue("fabricType", card.fabricType);
    setValue("designType", card.designType);
  };

  return (
    <UtilityPagePanel title="원단 조합">
      <ChipSinglePicker
        ariaLabel="원단 조합"
        value={currentValue}
        onValueChange={(val) => {
          const found = FABRIC_CARDS.find(
            (c) => `${c.fabricType}-${c.designType}` === val,
          );
          if (found) handleCardClick(found);
        }}
        options={FABRIC_CARDS.map((card) => ({
          value: `${card.fabricType}-${card.designType}`,
          label: card.label,
        }))}
      />
    </UtilityPagePanel>
  );
};
