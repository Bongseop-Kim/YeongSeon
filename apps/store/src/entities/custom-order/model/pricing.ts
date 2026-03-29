export interface PricingConfig {
  START_COST: number;
  SEWING_PER_COST: number;
  AUTO_TIE_COST: number;
  TRIANGLE_STITCH_COST: number;
  SIDE_STITCH_COST: number;
  BAR_TACK_COST: number;
  DIMPLE_COST: number;
  SPODERATO_COST: number;
  FOLD7_COST: number;
  WOOL_INTERLINING_COST: number;
  BRAND_LABEL_COST: number;
  CARE_LABEL_COST: number;
  YARN_DYED_DESIGN_COST: number;
  FABRIC_QTY_ADULT: number;
  FABRIC_QTY_ADULT_FOLD7: number;
  FABRIC_QTY_CHILD: number;
  FABRIC_COST: {
    YARN_DYED: {
      SILK: number;
      POLY: number;
    };
    PRINTING: {
      SILK: number;
      POLY: number;
    };
  };
  // sample-order 도메인이 usePricingConfig를 공유해 사용. 추후 sample-order 전용 쿼리로 분리 예정.
  SAMPLE_SEWING_COST: number;
  SAMPLE_FABRIC_PRINTING_COST: number;
  SAMPLE_FABRIC_YARN_DYED_COST: number;
  SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: number;
  SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: number;
}
