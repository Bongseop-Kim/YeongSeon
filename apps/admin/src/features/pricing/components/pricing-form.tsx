import { useState, useEffect } from "react";
import { Card, InputNumber, Button, Typography, Space, Spin, Row, Col } from "antd";
import { message } from "antd";
import {
  usePricingConstants,
  useFabricPrices,
  useUpdatePricingConstant,
  useUpdateFabricPrice,
  useTokenPricing,
  useUpdateTokenPricing,
  TOKEN_PRICING_TIERS,
  type TokenTierUI,
} from "@/features/pricing/api/pricing-query";
import type { PricingConstantRow, FabricPriceRow } from "@/features/pricing/types/admin-pricing";

const { Title } = Typography;

const CONSTANT_LABELS: Record<string, string> = {
  START_COST: "봉제 시작 비용 (기본 세팅비)",
  SEWING_PER_COST: "봉제 단가",
  AUTO_TIE_COST: "자동 타이",
  TRIANGLE_STITCH_COST: "삼각 봉제",
  SIDE_STITCH_COST: "옆선 봉제",
  BAR_TACK_COST: "바택",
  DIMPLE_COST: "딤플",
  SPODERATO_COST: "스포데라토",
  FOLD7_COST: "7폴드",
  WOOL_INTERLINING_COST: "울 심지 추가",
  BRAND_LABEL_COST: "브랜드 라벨",
  CARE_LABEL_COST: "케어 라벨",
  YARN_DYED_DESIGN_COST: "선염 디자인 비용",
  REFORM_BASE_COST: "수선 비용",
  REFORM_SHIPPING_COST: "수선 택배비",
};

const CONSTANT_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "기본 단가",
    keys: ["SEWING_PER_COST", "START_COST", "YARN_DYED_DESIGN_COST"],
  },
  {
    title: "옵션 봉제",
    keys: ["DIMPLE_COST", "FOLD7_COST", "SIDE_STITCH_COST", "TRIANGLE_STITCH_COST", "AUTO_TIE_COST", "SPODERATO_COST"],
  },
  {
    title: "부자재",
    keys: ["BAR_TACK_COST", "BRAND_LABEL_COST", "CARE_LABEL_COST", "WOOL_INTERLINING_COST"],
  },
  {
    title: "수선",
    keys: ["REFORM_BASE_COST", "REFORM_SHIPPING_COST"],
  },
];

const FABRIC_QTY_LABELS: Record<string, string> = {
  FABRIC_QTY_ADULT: "성인 (일반)",
  FABRIC_QTY_ADULT_FOLD7: "성인 (7폴드)",
  FABRIC_QTY_CHILD: "아동",
};
const FABRIC_QTY_KEYS = ["FABRIC_QTY_ADULT", "FABRIC_QTY_ADULT_FOLD7", "FABRIC_QTY_CHILD"];

const DESIGN_TYPE_LABELS: Record<string, string> = {
  YARN_DYED: "선염",
  PRINTING: "프린팅",
};

const FABRIC_TYPE_LABELS: Record<string, string> = {
  SILK: "실크",
  POLY: "폴리",
};

export function PricingForm() {
  const { data: constants, isLoading: loadingConstants, isError: errorConstants } = usePricingConstants();
  const { data: fabrics, isLoading: loadingFabrics, isError: errorFabrics } = useFabricPrices();
  const { data: tokenSettings } = useTokenPricing();

  const updateConstant = useUpdatePricingConstant();
  const updateFabric = useUpdateFabricPrice();
  const updateToken = useUpdateTokenPricing();

  const [constantDraft, setConstantDraft] = useState<Record<string, number>>({});
  const [fabricDraft, setFabricDraft] = useState<Record<string, number>>({});
  const [tokenDraft, setTokenDraft] = useState<Record<string, TokenTierUI>>({});

  useEffect(() => {
    if (constants) {
      const draft: Record<string, number> = {};
      for (const row of constants) {
        draft[row.key] = row.amount;
      }
      setConstantDraft(draft);
    }
  }, [constants]);

  useEffect(() => {
    if (fabrics) {
      const draft: Record<string, number> = {};
      for (const row of fabrics) {
        draft[`${row.design_type}__${row.fabric_type}`] = row.unit_price;
      }
      setFabricDraft(draft);
    }
  }, [fabrics]);

  useEffect(() => {
    if (tokenSettings) {
      const draft: Record<string, TokenTierUI> = {};
      for (const tier of tokenSettings) {
        draft[tier.priceKey] = tier;
      }
      setTokenDraft(draft);
    }
  }, [tokenSettings]);

  const saveAll = async () => {
    const constantMutations: PricingConstantRow[] = [];
    for (const row of constants ?? []) {
      if (constantDraft[row.key] !== row.amount) {
        constantMutations.push({ key: row.key, amount: constantDraft[row.key] ?? row.amount });
      }
    }

    const fabricMutations: FabricPriceRow[] = [];
    for (const row of fabrics ?? []) {
      const draftKey = `${row.design_type}__${row.fabric_type}`;
      if (fabricDraft[draftKey] !== row.unit_price) {
        fabricMutations.push({
          design_type: row.design_type,
          fabric_type: row.fabric_type,
          unit_price: fabricDraft[draftKey] ?? row.unit_price,
        });
      }
    }

    const tokenMutations: TokenTierUI[] = (tokenSettings ?? []).filter((tier) => {
      const draft = tokenDraft[tier.priceKey];
      return !!draft && (draft.price !== tier.price || draft.amount !== tier.amount);
    }).map((tier) => tokenDraft[tier.priceKey]);

    if (constantMutations.length === 0 && fabricMutations.length === 0 && tokenMutations.length === 0) {
      message.info("변경된 항목이 없습니다.");
      return;
    }

    try {
      await Promise.all([
        ...constantMutations.map((row) => updateConstant.mutateAsync(row)),
        ...fabricMutations.map((row) => updateFabric.mutateAsync(row)),
        ...(tokenMutations.length > 0 ? [updateToken.mutateAsync(tokenMutations)] : []),
      ]);
      if (constantMutations.length > 0 || fabricMutations.length > 0 || tokenMutations.length > 0) {
        message.success("가격이 저장되었습니다.");
      }
    } catch {
      // individual errors already shown by mutateAsync onError
    }
  };

  const isSaving = updateConstant.isPending || updateFabric.isPending || updateToken.isPending;

  if (loadingConstants || loadingFabrics) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (errorConstants || errorFabrics) {
    return (
      <Card>
        <Typography.Text type="danger">가격 정보를 불러오는데 실패했습니다.</Typography.Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card>
        <Title level={4}>봉제 비용</Title>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          {CONSTANT_GROUPS.map((group) => (
            <div key={group.title}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                {group.title}
              </Typography.Text>
              <Row gutter={[16, 16]}>
                {group.keys.map((key) => {
                  const row = (constants ?? []).find((r) => r.key === key);
                  if (!row) return null;
                  return (
                    <Col key={key} xs={24} sm={12} md={8}>
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Typography.Text>{CONSTANT_LABELS[key] ?? key}</Typography.Text>
                        <InputNumber
                          value={constantDraft[key] ?? row.amount}
                          min={0}
                          step={100}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={(v) => Number(v?.replace(/,/g, "") ?? 0)}
                          onChange={(v) =>
                            setConstantDraft((prev) => ({ ...prev, [key]: v ?? 0 }))
                          }
                          style={{ width: "100%" }}
                          addonAfter="원"
                        />
                      </Space>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}
        </Space>
      </Card>

      <Card>
        <Title level={4}>1마당 수량</Title>
        <Row gutter={[16, 16]}>
          {FABRIC_QTY_KEYS.map((key) => {
            const row = (constants ?? []).find((r) => r.key === key);
            if (!row) return null;
            return (
              <Col key={key} xs={24} sm={8}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text>{FABRIC_QTY_LABELS[key]}</Typography.Text>
                  <InputNumber
                    value={constantDraft[key] ?? row.amount}
                    min={1}
                    step={1}
                    onChange={(v) =>
                      setConstantDraft((prev) => ({ ...prev, [key]: v ?? 1 }))
                    }
                    style={{ width: "100%" }}
                    addonAfter="장/마"
                  />
                </Space>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card>
        <Title level={4}>원단 비용</Title>
        <Row gutter={[16, 16]}>
          {(fabrics ?? []).map((row) => {
            const draftKey = `${row.design_type}__${row.fabric_type}`;
            return (
              <Col key={draftKey} xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text>
                    {DESIGN_TYPE_LABELS[row.design_type] ?? row.design_type} /{" "}
                    {FABRIC_TYPE_LABELS[row.fabric_type] ?? row.fabric_type}
                  </Typography.Text>
                  <InputNumber
                    value={fabricDraft[draftKey] ?? row.unit_price}
                    min={0}
                    step={100}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => Number(v?.replace(/,/g, "") ?? 0)}
                    onChange={(v) =>
                      setFabricDraft((prev) => ({ ...prev, [draftKey]: v ?? 0 }))
                    }
                    style={{ width: "100%" }}
                    addonAfter="원"
                  />
                </Space>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card>
        <Title level={4}>토큰 구매 가격</Title>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          많이 살수록 토큰 1개당 단가가 낮아집니다.
        </Typography.Text>
        <Row gutter={[16, 16]}>
          {TOKEN_PRICING_TIERS.map(({ label, priceKey, amountKey }) => {
            const tier = tokenDraft[priceKey] ?? tokenSettings?.find((item) => item.priceKey === priceKey);
            return (
              <Col key={priceKey} xs={24} sm={8}>
                <Card size="small" style={{ background: "#fafafa" }}>
                  <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
                    {tier?.label ?? label}
                  </Typography.Text>
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>가격</Typography.Text>
                      <InputNumber
                        value={Number.isNaN(Number(tier?.price)) ? undefined : Number(tier?.price)}
                        min={1}
                        step={100}
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={(v) => Number(v?.replace(/,/g, "") ?? 0)}
                        onChange={(v) =>
                          setTokenDraft((prev) => ({
                            ...prev,
                            [priceKey]: {
                              label,
                              priceKey,
                              amountKey,
                              price: v == null ? (prev[priceKey]?.price ?? tier?.price ?? "0") : String(v),
                              amount: prev[priceKey]?.amount ?? tier?.amount ?? "0",
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                        suffix="원"
                      />
                    </Space>
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>토큰 수량</Typography.Text>
                      <InputNumber
                        value={Number.isNaN(Number(tier?.amount)) ? undefined : Number(tier?.amount)}
                        min={1}
                        onChange={(v) =>
                          setTokenDraft((prev) => ({
                            ...prev,
                            [priceKey]: {
                              label,
                              priceKey,
                              amountKey,
                              price: prev[priceKey]?.price ?? tier?.price ?? "0",
                              amount: v == null ? (prev[priceKey]?.amount ?? tier?.amount ?? "0") : String(v),
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                        suffix="T"
                      />
                    </Space>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Button type="primary" onClick={saveAll} loading={isSaving} disabled={isSaving}>
        저장
      </Button>
    </Space>
  );
}
