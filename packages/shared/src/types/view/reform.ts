export type MeasurementType = "length" | "height";

export const isMeasurementType = (value: unknown): value is MeasurementType =>
  value === "length" || value === "height";

export interface TieItem {
  id?: string;
  image?: File | string; // File: 업로드 시, string: DB에서 복원된 URL
  fileId?: string; // ImageKit fileId (업로드 후 설정, DB 복원 시 null 가능)
  measurementType?: MeasurementType;
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
    measurementType?: MeasurementType;
  };
}
