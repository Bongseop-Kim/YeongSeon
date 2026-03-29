import { useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { RadioChoiceField } from "@/shared/composite/radio-choice-field";
import { RadioGroup } from "@/shared/ui/radio-group";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { StepLayout } from "./step-layout";

interface FabricCard {
  fabricType: "POLY" | "SILK";
  designType: "PRINTING" | "YARN_DYED";
  label: string;
  description: string;
}

const FABRIC_META_LABELS = {
  POLY: "경제형 베이스",
  SILK: "광택 중심",
  PRINTING: "선명한 발색",
  YARN_DYED: "직조 패턴",
} as const;

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
      <UtilityPagePanel
        title="원단 조합"
        description="소재와 직조 방식 조합을 정하면 이후 봉제와 마감 선택 기준이 선명해집니다."
      >
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
                <RadioChoiceField
                  key={cardValue}
                  value={cardValue}
                  id={`fabric-${cardValue}`}
                  selected={isSelected(card)}
                  variant="row"
                  title={card.label}
                  description={card.description}
                  meta={
                    <>
                      <span>{FABRIC_META_LABELS[card.fabricType]}</span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span>{FABRIC_META_LABELS[card.designType]}</span>
                    </>
                  }
                />
              );
            })}
          </div>
        </RadioGroup>
      </UtilityPagePanel>
    </StepLayout>
  );
};
