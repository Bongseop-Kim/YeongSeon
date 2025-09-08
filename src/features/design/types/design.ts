export interface DesignOptions {
  isPattern: boolean;
  horizontalCount: number;
  verticalCount: number;
  imageSize: number;
  position: number;
  verticalPosition: number;
  rotation: number;
  patternType: PatternType;
  isLinked: boolean;
  gap: number;
  selectedFile?: File;
  selectedFile2?: File;
  color: string;
  text: string;
}

export type PatternType = "normal" | "grid1";
