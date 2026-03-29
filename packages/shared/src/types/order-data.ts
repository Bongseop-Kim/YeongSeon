export interface CustomOrderData {
  options: {
    tieType: string | null;
    interlining: string | null;
    designType: string | null;
    fabricType: string | null;
    fabricProvided: boolean;
    triangleStitch: boolean;
    sideStitch: boolean;
    barTack: boolean;
    dimple: boolean;
    spoderato: boolean;
    fold7: boolean;
    brandLabel: boolean;
    careLabel: boolean;
  };
  pricing: {
    sewingCost: number;
    fabricCost: number;
    sampleCost: number;
    totalCost: number;
  };
  sample?: boolean;
  sampleType?: string | null;
  referenceImageUrls: string[];
  additionalNotes: string | null;
}

export interface SampleOrderData {
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: {
    fabricType: string | null;
    designType: string | null;
    tieType: string | null;
    interlining: string | null;
  };
  pricing: {
    totalCost: number;
  };
  referenceImageUrls: string[];
  additionalNotes: string | null;
}
