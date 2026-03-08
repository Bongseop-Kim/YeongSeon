import type { Attachment } from "@/features/design/types/chat";
import type {
  FabricMethod,
  PatternOption,
} from "@/features/design/types/design-context";
import type { AiDesignRequest } from "@/features/design/api/ai-design-api";

const DEFAULT_TAGS = ["클래식", "프리미엄", "넥타이"];

const PATTERN_LABELS: Record<PatternOption, string> = {
  stripe: "스트라이프",
  dot: "도트",
  check: "체크",
  paisley: "페이즐리",
  plain: "솔리드",
  houndstooth: "하운즈투스",
  floral: "플로럴",
  custom: "커스텀",
};

const FABRIC_LABELS: Record<FabricMethod, string> = {
  "yarn-dyed": "선염",
  print: "날염",
};

const getAttachmentLabels = (
  attachments: Attachment[],
  type: Attachment["type"],
): string[] =>
  attachments
    .filter((attachment) => attachment.type === type && attachment.label.trim().length > 0)
    .map((attachment) => attachment.label.trim());

export const getTags = (request: AiDesignRequest): string[] => {
  const colorLabels = getAttachmentLabels(request.attachments, "color");
  const patternLabels = getAttachmentLabels(request.attachments, "pattern");
  const fabricLabels = getAttachmentLabels(request.attachments, "fabric");

  if (patternLabels.length === 0 && request.designContext.pattern) {
    patternLabels.push(PATTERN_LABELS[request.designContext.pattern]);
  }

  if (fabricLabels.length === 0 && request.designContext.fabricMethod) {
    fabricLabels.push(FABRIC_LABELS[request.designContext.fabricMethod]);
  }

  const tags = [...colorLabels, ...patternLabels, ...fabricLabels]
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .slice(0, 3);

  return tags.length > 0 ? tags : DEFAULT_TAGS;
};

