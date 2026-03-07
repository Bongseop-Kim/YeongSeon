import type { Attachment, ContextChip } from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import { supabase } from "@/lib/supabase";
import {
  getTags,
} from "@/features/design/api/ai-design-mapper";

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
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

  const serializedAttachments = request.attachments.map((attachment) => ({
    type: attachment.type,
    label: attachment.label,
    value: attachment.value,
  }));

  const { data, error } = await supabase.functions.invoke("generate-design", {
    body: {
      userMessage: request.userMessage,
      attachments: serializedAttachments,
      designContext: {
        colors: request.designContext.colors,
        pattern: request.designContext.pattern,
        fabricMethod: request.designContext.fabricMethod,
      },
      conversationHistory: request.conversationHistory ?? [],
      ciImageBase64,
      ciImageMimeType: request.designContext.ciImage?.type || undefined,
    },
  });

  if (error) {
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
  };
}
