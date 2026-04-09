export interface TieItemDTO {
  id: string;
  image?: string;
  fileId?: string;
  measurementType?: "length" | "height";
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
  hasLengthReform?: boolean;
  hasWidthReform?: boolean;
  targetWidth?: number;
  dimple?: boolean;
}

export interface TieItemCreateDTO {
  id?: string;
  image?: string;
  fileId?: string;
  measurementType?: "length" | "height";
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
  hasLengthReform?: boolean;
  hasWidthReform?: boolean;
  targetWidth?: number;
  dimple?: boolean;
}
