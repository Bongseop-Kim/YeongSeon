export interface TieItem {
  id: string;
  image?: File;
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
}

export interface ReformOptions {
  ties: TieItem[];
  bulkApply: {
    tieLength?: number;
    wearerHeight?: number;
  };
}
