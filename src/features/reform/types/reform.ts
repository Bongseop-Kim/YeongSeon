export interface TieItem {
  id: string;
  image?: File;
  measurementType?: "length" | "height";
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
  checked?: boolean;
}

export interface ReformOptions {
  ties: TieItem[];
  bulkApply: {
    tieLength?: number;
    wearerHeight?: number;
    measurementType?: "length" | "height";
  };
}
