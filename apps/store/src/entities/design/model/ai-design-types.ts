export interface Attachment {
  type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
  label: string;
  value: string;
  file?: File;
  fileName?: string;
}

export interface ContextChip {
  label: string;
  action: string;
}
