import type { Attachment, ContextChip } from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import {
  getMessageKeyword,
  getTags,
  hasCiImageAttachment,
} from "@/features/design/api/ai-design-mapper";

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
}

export interface AiDesignResponse {
  aiMessage: string;
  backgroundColor: string;
  tags: string[];
  contextChips: ContextChip[];
}

const SAMPLE_FABRIC_IMAGE = "url(/images/sample-fabric.jpg) center/cover no-repeat";

const FOLLOW_UP_CHIPS: ContextChip[] = [
  { label: "패턴 간격 조절", action: "패턴 좀 더 촘촘하게 해줘" },
  { label: "색상 비율 조정", action: "골드 비율을 더 늘려줘" },
  { label: "단체주문 견적", action: "50개 단체주문 견적 내줘" },
];

const CI_CHIPS: ContextChip[] = [
  { label: "올 패턴으로", action: "올 패턴으로 배치해줘" },
  { label: "원 포인트로", action: "원 포인트로 하단에 넣어줘" },
];

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function mockAiDesignApi(
  request: AiDesignRequest,
): Promise<AiDesignResponse> {
  await delay(1500);

  const keyword = getMessageKeyword(request.userMessage);
  const baseMessage = `넥타이 디자인을 생성했습니다. ${keyword}를 반영한 스타일로 제작했어요.`;
  const hasCi = hasCiImageAttachment(request.attachments);
  const aiMessage = hasCi
    ? `${baseMessage} CI 이미지를 확인했습니다. 올 패턴으로 적용할까요, 원 포인트로 적용할까요?`
    : baseMessage;

  return {
    aiMessage,
    backgroundColor: SAMPLE_FABRIC_IMAGE,
    tags: getTags(request),
    contextChips: hasCi ? CI_CHIPS : FOLLOW_UP_CHIPS,
  };
}
