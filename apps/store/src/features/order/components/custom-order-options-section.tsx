import { DetailRow } from "@/components/composite/detail-row";
import { Badge } from "@/components/ui/badge";

const ADDITIONAL_OPTION_LABELS = [
  { key: "triangleStitch", label: "삼각봉제" },
  { key: "sideStitch", label: "옆선봉제" },
  { key: "barTack", label: "바택" },
  { key: "dimple", label: "딤플" },
  { key: "spoderato", label: "스포데라토" },
  { key: "fold7", label: "7폴드" },
  { key: "brandLabel", label: "브랜드라벨" },
  { key: "careLabel", label: "케어라벨" },
] as const;

interface CustomOrderOptionsSectionProps {
  options: {
    tieType?: string | null;
    interlining?: string | null;
    designType?: string | null;
    fabricType?: string | null;
    fabricProvided?: boolean;
    interliningThickness?: string | null;
    triangleStitch?: boolean;
    sideStitch?: boolean;
    barTack?: boolean;
    dimple?: boolean;
    spoderato?: boolean;
    fold7?: boolean;
    brandLabel?: boolean;
    careLabel?: boolean;
  };
  referenceImageUrls?: string[];
  additionalNotes?: string | null;
  sampleType?: string | null;
}

const formatDetailValue = (value?: string | null) =>
  value == null || value.trim() === "" ? "-" : value;

export function CustomOrderOptionsSection({
  options,
  referenceImageUrls,
  additionalNotes,
  sampleType,
}: CustomOrderOptionsSectionProps) {
  const enabledAdditionalOptions = ADDITIONAL_OPTION_LABELS.filter(
    ({ key }) => options[key],
  );
  const hasReferenceImages =
    Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0;
  const hasAdditionalNotes =
    typeof additionalNotes === "string" && additionalNotes.trim() !== "";
  const hasSampleType =
    typeof sampleType === "string" && sampleType.trim() !== "";

  return (
    <div className="space-y-6">
      <div>
        <DetailRow
          label="넥타이 유형"
          value={formatDetailValue(options.tieType)}
        />
        <DetailRow
          label="심지"
          value={formatDetailValue(options.interlining)}
        />
        <DetailRow
          label="디자인 유형"
          value={formatDetailValue(options.designType)}
        />
        <DetailRow
          label="원단 유형"
          value={formatDetailValue(options.fabricType)}
        />
        <DetailRow
          label="원단 지참"
          value={options.fabricProvided ? "예" : "아니오"}
        />
        <DetailRow
          label="심지 두께"
          value={formatDetailValue(options.interliningThickness)}
        />
        {hasSampleType && (
          <DetailRow label="샘플 유형" value={formatDetailValue(sampleType)} />
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-zinc-900">추가 옵션</div>
        {enabledAdditionalOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {enabledAdditionalOptions.map((option) => (
              <Badge key={option.key} variant="secondary">
                {option.label}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            선택한 추가 옵션이 없습니다.
          </div>
        )}
      </div>

      {hasReferenceImages && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-zinc-900">참조 이미지</div>
          <div className="grid grid-cols-2 gap-3">
            {referenceImageUrls.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="overflow-hidden rounded-lg border bg-zinc-50"
              >
                <img
                  src={imageUrl}
                  alt={`참조 이미지 ${index + 1}`}
                  className="aspect-square h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAdditionalNotes && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-zinc-900">추가 메모</div>
          <p className="whitespace-pre-wrap text-sm text-zinc-700">
            {additionalNotes}
          </p>
        </div>
      )}
    </div>
  );
}
