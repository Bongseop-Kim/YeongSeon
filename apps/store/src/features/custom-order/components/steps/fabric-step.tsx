import { useFormContext } from "react-hook-form";
import { RadioCard } from "@/components/composite/radio-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { StepLayout } from "./step-layout";

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
  const currentValue = `${currentFabricType}-${currentDesignType}`;

  const handleCardClick = (card: FabricCard) => {
    setValue("fabricType", card.fabricType);
    setValue("designType", card.designType);
  };

  const isSelected = (card: FabricCard) =>
    currentFabricType === card.fabricType &&
    currentDesignType === card.designType;

  return (
    <StepLayout
      guideTitle="선택 가이드"
      guideItems={[
        "POLY는 경제적, SILK는 광택감",
        "PRINTING은 선명한 표현",
        "YARN_DYED는 직조 패턴 강조",
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>원단 조합</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentValue}
            onValueChange={(val) => {
              const found = FABRIC_CARDS.find(
                (c) => `${c.fabricType}-${c.designType}` === val,
              );
              if (found) handleCardClick(found);
            }}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FABRIC_CARDS.map((card) => {
                const cardValue = `${card.fabricType}-${card.designType}`;

                return (
                  <RadioCard
                    key={cardValue}
                    value={cardValue}
                    id={`fabric-${cardValue}`}
                    selected={isSelected(card)}
                  >
                    <CardHeader>
                      <CardTitle>{card.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{card.description}</CardDescription>
                    </CardContent>
                  </RadioCard>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </StepLayout>
  );
};
