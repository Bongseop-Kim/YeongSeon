export interface TieItem {
  id: string;
  image?: File | string; // File: 업로드 시, string: DB에서 복원된 URL
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
