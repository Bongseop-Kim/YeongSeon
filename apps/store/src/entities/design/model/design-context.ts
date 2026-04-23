export type FabricMethod = "yarn-dyed" | "print";
export type PatternOption =
  | "stripe"
  | "dot"
  | "check"
  | "paisley"
  | "plain"
  | "houndstooth"
  | "floral";
export type CiPlacement = "all-over" | "one-point";

export interface DesignContext {
  colors: string[];
  pattern: PatternOption | null;
  fabricMethod: FabricMethod | null;
  sourceImage: File | null;
  onePointOffsetX: number;
  onePointOffsetY: number;
  ciImage: File | null;
  ciPlacement: CiPlacement | null;
  referenceImage: File | null;
}
