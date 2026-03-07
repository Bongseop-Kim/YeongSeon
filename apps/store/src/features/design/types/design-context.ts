export type FabricMethod = "yarn-dyed" | "print";
export type PatternOption =
  | "stripe"
  | "dot"
  | "check"
  | "paisley"
  | "plain"
  | "houndstooth"
  | "floral"
  | "custom";

export interface DesignContext {
  colors: string[];
  pattern: PatternOption | null;
  fabricMethod: FabricMethod | null;
  ciImage: File | null;
  referenceImage: File | null;
}
