export interface TieItemDTO {
  id: string;
  image?: string;
  measurementType?: "length" | "height";
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
}

export interface TieItemCreateDTO {
  id?: string;
  image?: string;
  measurementType?: "length" | "height";
  tieLength?: number;
  wearerHeight?: number;
  notes?: string;
}
