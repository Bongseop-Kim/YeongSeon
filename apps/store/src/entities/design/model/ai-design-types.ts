export type AiModel = "openai" | "gemini";

export interface Attachment {
  type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
  label: string;
  value: string;
  file?: File;
}

export interface ContextChip {
  label: string;
  action: string;
}
