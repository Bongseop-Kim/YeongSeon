import type { AiModel, Attachment, ContextChip } from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import { supabase } from "@/lib/supabase";
import {
  getTags,
} from "@/features/design/api/ai-design-mapper";

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
  aiModel: AiModel;
  conversationHistory?: {
    role: "user" | "ai";
    content: string;
  }[];
  ciImageBase64?: string;
  ciImageMimeType?: string;
}

export interface AiDesignResponse {
  aiMessage: string;
  imageUrl: string | null;
  tags: string[];
  contextChips: ContextChip[];
  remainingTokens?: number;
}

export class InsufficientTokensError extends Error {
  constructor(
    public readonly balance: number,
    public readonly cost: number,
  ) {
    super("insufficient_tokens");
    this.name = "InsufficientTokensError";
  }
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("CI 이미지 인코딩 결과가 올바르지 않습니다."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("CI 이미지 인코딩에 실패했습니다."));
    };

    reader.readAsDataURL(file);
  });

export async function aiDesignApi(
  request: AiDesignRequest,
): Promise<AiDesignResponse> {
  const ciImageBase64 = request.designContext.ciImage
    ? await fileToBase64(request.designContext.ciImage)
    : undefined;

  const referenceImageBase64 = request.designContext.referenceImage
    ? await fileToBase64(request.designContext.referenceImage)
    : undefined;

  const functionName = request.aiModel === "openai" ? "generate-open-api" : "generate-google-api";

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {
      userMessage: request.userMessage,
      designContext: {
        colors: request.designContext.colors,
        pattern: request.designContext.pattern,
        fabricMethod: request.designContext.fabricMethod,
        ciPlacement: request.designContext.ciPlacement,
      },
      conversationHistory: request.conversationHistory ?? [],
      ciImageBase64,
      ciImageMimeType: request.designContext.ciImage?.type || undefined,
      referenceImageBase64,
      referenceImageMimeType: request.designContext.referenceImage?.type || undefined,
    },
  });

  if (error) {
    // FunctionsHttpError의 context에서 에러 바디 파싱 시도
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.json() as { error?: string; balance?: number; cost?: number };
        if (body.error === "insufficient_tokens") {
          throw new InsufficientTokensError(body.balance ?? 0, body.cost ?? 0);
        }
      } catch (parseErr) {
        if (parseErr instanceof InsufficientTokensError) throw parseErr;
      }
    }
    throw new Error(`디자인 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("디자인 생성 결과를 받을 수 없습니다.");
  }

  return {
    aiMessage: data.aiMessage,
    imageUrl: data.imageUrl ?? null,
    tags: getTags(request),
    contextChips: Array.isArray(data.contextChips) ? data.contextChips : [],
    remainingTokens: typeof data.remainingTokens === "number" ? data.remainingTokens : undefined,
  };
}

export async function getDesignTokenBalance(): Promise<number> {
  const { data, error } = await supabase.rpc("get_design_token_balance");

  if (error) {
    throw new Error(`토큰 잔액 조회 실패: ${error.message}`);
  }

  return (data as number) ?? 0;
}
