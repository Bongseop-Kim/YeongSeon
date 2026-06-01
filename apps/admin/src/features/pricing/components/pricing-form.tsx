import { useEffect, useMemo, useRef, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "seed-design/ui/tabs";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import {
  SAMPLE_DISCOUNT_KEYS,
  TOKEN_PRICING_TIERS,
  useFabricPrices,
  usePricingConstants,
  useSampleCouponAmounts,
  useTokenPricing,
  useUpdateFabricPrice,
  useUpdatePricingConstant,
  useUpdateSampleCouponAmounts,
  useUpdateTokenPricing,
} from "@/features/pricing/api/pricing-query";
import type {
  PricingConstantRow,
  SampleDiscountKey,
  TokenTierUI,
} from "@/features/pricing/types/admin-pricing";
import "./pricing-form.css";

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
  REFORM_WIDTH_COST: "폭수선 비용",
  SAMPLE_SEWING_COST: "봉제 샘플",
  SAMPLE_FABRIC_PRINTING_COST: "원단 샘플 (날염)",
  SAMPLE_FABRIC_YARN_DYED_COST: "원단 샘플 (선염)",
  SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: "원단+봉제 샘플 (날염)",
  SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: "원단+봉제 샘플 (선염)",
};

const SEWING_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "기본 단가",
    keys: ["SEWING_PER_COST", "START_COST", "YARN_DYED_DESIGN_COST"],
  },
  {
    title: "옵션 봉제",
    keys: [
      "DIMPLE_COST",
      "FOLD7_COST",
      "SIDE_STITCH_COST",
      "TRIANGLE_STITCH_COST",
      "AUTO_TIE_COST",
      "SPODERATO_COST",
    ],
  },
  {
    title: "부자재",
    keys: [
      "BAR_TACK_COST",
      "BRAND_LABEL_COST",
      "CARE_LABEL_COST",
      "WOOL_INTERLINING_COST",
    ],
  },
];

const REFORM_KEYS = [
  "REFORM_BASE_COST",
  "REFORM_SHIPPING_COST",
  "REFORM_WIDTH_COST",
];
const SAMPLE_KEYS = [
  "SAMPLE_SEWING_COST",
  "SAMPLE_FABRIC_PRINTING_COST",
  "SAMPLE_FABRIC_YARN_DYED_COST",
  "SAMPLE_FABRIC_AND_SEWING_PRINTING_COST",
  "SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST",
];
const FABRIC_QTY_KEYS = [
  "FABRIC_QTY_ADULT",
  "FABRIC_QTY_ADULT_FOLD7",
  "FABRIC_QTY_CHILD",
];

const SAMPLE_COUPON_LABELS: Record<string, string> = {
  sample_discount_sewing: "봉제 샘플 할인",
  sample_discount_fabric_printing: "원단 샘플 (날염) 할인",
  sample_discount_fabric_yarn_dyed: "원단 샘플 (선염) 할인",
  sample_discount_fabric_and_sewing_printing: "원단+봉제 샘플 (날염) 할인",
  sample_discount_fabric_and_sewing_yarn_dyed: "원단+봉제 샘플 (선염) 할인",
};

const DESIGN_TYPE_LABELS: Record<string, string> = {
  YARN_DYED: "선염",
  PRINTING: "프린팅",
};
const FABRIC_TYPE_LABELS: Record<string, string> = {
  SILK: "실크",
  POLY: "폴리",
};

type PricingTab = "sewing" | "reform" | "fabric" | "sample" | "token";
type Notice = { tone: "positive" | "critical"; message: string };

const PRICING_TABS = new Set<PricingTab>([
  "sewing",
  "reform",
  "fabric",
  "sample",
  "token",
]);

function getInitialPricingTab(): PricingTab {
  if (typeof window === "undefined") return "sewing";

  const tab = new URLSearchParams(window.location.search).get("tab");
  return PRICING_TABS.has(tab as PricingTab) ? (tab as PricingTab) : "sewing";
}

function isInvalidAmount(value: number | undefined, min: number): boolean {
  return (
    value === undefined ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < min
  );
}

function pricingFieldError(label: string, min: number): string {
  return min > 0
    ? `${label}은 ${min} 이상의 정수로 입력해주세요.`
    : `${label}은 0 이상의 정수로 입력해주세요.`;
}

function getConstantMin(key: string) {
  return FABRIC_QTY_KEYS.includes(key) ? 1 : 0;
}

const parseFabricKey = (
  key: string,
): { designType: string; fabricType: string } => {
  const withoutPrefix = key.replace(/^FABRIC_/, "");
  const lastUnderscoreIdx = withoutPrefix.lastIndexOf("_");
  return {
    designType: withoutPrefix.slice(0, lastUnderscoreIdx),
    fabricType: withoutPrefix.slice(lastUnderscoreIdx + 1),
  };
};

function parseAmount(value: string): number {
  const normalizedValue = value.replace(/,/g, "").trim();
  if (!normalizedValue) return Number.NaN;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function PricingNumberField({
  fieldKey,
  label,
  value,
  min = 0,
  step = 100,
  suffix,
  disabled,
  errorMessage,
  inputRef,
  onChange,
}: {
  fieldKey: string;
  label: string;
  value: number | undefined;
  min?: number;
  step?: number;
  suffix: string;
  disabled?: boolean;
  errorMessage?: string;
  inputRef?: (element: HTMLInputElement | null) => void;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      className="adminSettingsField"
      label={label}
      name={fieldKey}
      value={value == null || Number.isNaN(value) ? "" : String(value)}
      onValueChange={({ value: nextValue }) => onChange(parseAmount(nextValue))}
      suffix={suffix}
      disabled={disabled}
      invalid={Boolean(errorMessage)}
      errorMessage={errorMessage}
    >
      <TextFieldInput
        ref={inputRef}
        name={fieldKey}
        type="number"
        min={min}
        step={step}
        inputMode="numeric"
        autoComplete="off"
      />
    </TextField>
  );
}

function rowsByKey(rows: PricingConstantRow[] | undefined) {
  return new Map((rows ?? []).map((row) => [row.key, row]));
}

function sampleCouponAmountsToDraft(
  amounts: Record<SampleDiscountKey, number> | undefined,
): Record<SampleDiscountKey, number> {
  return Object.fromEntries(
    SAMPLE_DISCOUNT_KEYS.map((key) => [key, amounts?.[key] ?? 0]),
  ) as Record<SampleDiscountKey, number>;
}

export function PricingForm() {
  const constantsQuery = usePricingConstants();
  const fabricsQuery = useFabricPrices();
  const tokenQuery = useTokenPricing();
  const sampleCouponQuery = useSampleCouponAmounts();
  const updateConstant = useUpdatePricingConstant();
  const updateFabric = useUpdateFabricPrice();
  const updateToken = useUpdateTokenPricing();
  const updateSampleCoupons = useUpdateSampleCouponAmounts();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<PricingTab>(getInitialPricingTab);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [constantDraft, setConstantDraft] = useState<Record<string, number>>(
    {},
  );
  const [fabricDraft, setFabricDraft] = useState<Record<string, number>>({});
  const [tokenDraft, setTokenDraft] = useState<Record<string, TokenTierUI>>({});
  const [sampleCouponDraft, setSampleCouponDraft] = useState<
    Record<SampleDiscountKey, number>
  >({} as Record<SampleDiscountKey, number>);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const constants = constantsQuery.data;
  const fabrics = fabricsQuery.data;
  const tokenSettings = tokenQuery.data;
  const sampleCouponAmounts = sampleCouponQuery.data;
  const constantsMap = useMemo(() => rowsByKey(constants), [constants]);

  useEffect(() => {
    if (constants) {
      setConstantDraft(
        Object.fromEntries(constants.map((row) => [row.key, row.amount])),
      );
    }
  }, [constants]);

  useEffect(() => {
    if (fabrics) {
      setFabricDraft(
        Object.fromEntries(fabrics.map((row) => [row.key, row.amount])),
      );
    }
  }, [fabrics]);

  useEffect(() => {
    if (tokenSettings) {
      setTokenDraft(
        Object.fromEntries(tokenSettings.map((tier) => [tier.priceKey, tier])),
      );
    }
  }, [tokenSettings]);

  const allSewingKeys = useMemo(
    () => [...SEWING_GROUPS.flatMap((group) => group.keys), ...FABRIC_QTY_KEYS],
    [],
  );

  const changedItemCount = useMemo(() => {
    let count = 0;

    for (const row of constants ?? []) {
      if (
        constantDraft[row.key] !== undefined &&
        constantDraft[row.key] !== row.amount
      ) {
        count += 1;
      }
    }

    for (const row of fabrics ?? []) {
      if (
        fabricDraft[row.key] !== undefined &&
        fabricDraft[row.key] !== row.amount
      ) {
        count += 1;
      }
    }

    for (const tier of tokenSettings ?? []) {
      const draft = tokenDraft[tier.priceKey];
      if (!draft) continue;
      if (draft.price !== tier.price) count += 1;
      if (draft.amount !== tier.amount) count += 1;
    }

    if (sampleCouponQuery.isSuccess) {
      for (const key of SAMPLE_DISCOUNT_KEYS) {
        if (
          sampleCouponDraft[key] !== undefined &&
          sampleCouponDraft[key] !== sampleCouponAmounts?.[key]
        ) {
          count += 1;
        }
      }
    }

    return count;
  }, [
    constantDraft,
    constants,
    fabricDraft,
    fabrics,
    sampleCouponAmounts,
    sampleCouponDraft,
    sampleCouponQuery.isSuccess,
    tokenDraft,
    tokenSettings,
  ]);

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldKey]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldKey];
      return nextErrors;
    });
  };

  const registerFieldRef =
    (fieldKey: string) => (element: HTMLInputElement | null) => {
      fieldRefs.current[fieldKey] = element;
    };

  const validateDrafts = () => {
    const nextErrors: Record<string, string> = {};

    const validateField = (
      fieldKey: string,
      label: string,
      value: number | undefined,
      min: number,
    ) => {
      if (isInvalidAmount(value, min)) {
        nextErrors[fieldKey] = pricingFieldError(label, min);
      }
    };

    for (const row of constants ?? []) {
      const label = CONSTANT_LABELS[row.key] ?? row.key;
      validateField(
        row.key,
        label,
        constantDraft[row.key] ?? row.amount,
        getConstantMin(row.key),
      );
    }

    for (const row of fabrics ?? []) {
      const { designType, fabricType } = parseFabricKey(row.key);
      validateField(
        row.key,
        `${DESIGN_TYPE_LABELS[designType] ?? designType} / ${FABRIC_TYPE_LABELS[fabricType] ?? fabricType}`,
        fabricDraft[row.key] ?? row.amount,
        0,
      );
    }

    for (const tier of tokenSettings ?? []) {
      const draft = tokenDraft[tier.priceKey] ?? tier;
      validateField(tier.priceKey, `${tier.label} 가격`, draft.price, 1);
      validateField(tier.amountKey, `${tier.label} 토큰 수량`, draft.amount, 1);
    }

    if (sampleCouponQuery.isSuccess) {
      for (const key of SAMPLE_DISCOUNT_KEYS) {
        validateField(
          key,
          SAMPLE_COUPON_LABELS[key] ?? key,
          sampleCouponDraft[key] ?? sampleCouponAmounts?.[key],
          0,
        );
      }
    }

    return nextErrors;
  };

  const resetDrafts = () => {
    setConstantDraft(
      Object.fromEntries((constants ?? []).map((row) => [row.key, row.amount])),
    );
    setFabricDraft(
      Object.fromEntries((fabrics ?? []).map((row) => [row.key, row.amount])),
    );
    setTokenDraft(
      Object.fromEntries(
        (tokenSettings ?? []).map((tier) => [tier.priceKey, tier]),
      ),
    );
    setSampleCouponDraft(sampleCouponAmountsToDraft(sampleCouponAmounts));
    setFieldErrors({});
    setNotice(null);
  };

  const saveAll = async () => {
    setNotice(null);

    const nextErrors = validateDrafts();
    const firstErrorKey = Object.keys(nextErrors)[0];
    if (firstErrorKey) {
      setFieldErrors(nextErrors);
      setNotice({ tone: "critical", message: "입력값을 확인해주세요." });
      fieldRefs.current[firstErrorKey]?.focus();
      return;
    }

    setFieldErrors({});

    const constantMutations = (constants ?? []).flatMap((row) =>
      constantDraft[row.key] !== row.amount
        ? [{ key: row.key, amount: constantDraft[row.key] ?? row.amount }]
        : [],
    );
    const fabricMutations = (fabrics ?? []).flatMap((row) =>
      fabricDraft[row.key] !== row.amount
        ? [{ key: row.key, amount: fabricDraft[row.key] ?? row.amount }]
        : [],
    );
    const tokenMutations = Object.values(tokenDraft).filter((draft) => {
      const existing = (tokenSettings ?? []).find(
        (tier) => tier.priceKey === draft.priceKey,
      );
      return (
        !existing ||
        draft.price !== existing.price ||
        draft.amount !== existing.amount
      );
    });
    const couponMutations = sampleCouponQuery.isSuccess
      ? SAMPLE_DISCOUNT_KEYS.flatMap((key) => {
          const amount = sampleCouponDraft[key];
          if (amount === undefined || amount === sampleCouponAmounts?.[key])
            return [];
          return [{ key, amount }];
        })
      : [];

    if (
      !constantMutations.length &&
      !fabricMutations.length &&
      !tokenMutations.length &&
      !couponMutations.length
    ) {
      setNotice({ tone: "positive", message: "변경된 항목이 없습니다." });
      return;
    }

    try {
      await Promise.all([
        ...constantMutations.map((row) => updateConstant.mutateAsync(row)),
        ...fabricMutations.map((row) => updateFabric.mutateAsync(row)),
        ...(tokenMutations.length
          ? [updateToken.mutateAsync(tokenMutations)]
          : []),
        ...(couponMutations.length
          ? [updateSampleCoupons.mutateAsync(couponMutations)]
          : []),
      ]);
      setNotice({
        tone: "positive",
        message: "가격 변경사항이 저장되었습니다.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setNotice({ tone: "critical", message: `저장 실패: ${message}` });
    }
  };

  const isSaving =
    updateConstant.isPending ||
    updateFabric.isPending ||
    updateToken.isPending ||
    updateSampleCoupons.isPending;
  const loadError =
    constantsQuery.error ??
    fabricsQuery.error ??
    tokenQuery.error ??
    sampleCouponQuery.error;
  const hasPendingChanges = changedItemCount > 0;
  const saveButtonLabel = hasPendingChanges
    ? `변경사항 ${changedItemCount}개 저장`
    : "가격 변경사항 저장";
  const saveSummary = `저장하지 않은 변경사항 ${changedItemCount}개가 있습니다.`;

  const hasConstantChanges = (keys: string[]) =>
    keys.some((key) => {
      const row = constantsMap.get(key);
      return (
        row &&
        constantDraft[key] !== undefined &&
        constantDraft[key] !== row.amount
      );
    });

  const hasFabricChanges = (fabrics ?? []).some(
    (row) =>
      fabricDraft[row.key] !== undefined && fabricDraft[row.key] !== row.amount,
  );
  const hasSampleChanges =
    sampleCouponQuery.isSuccess &&
    SAMPLE_DISCOUNT_KEYS.some(
      (key) =>
        sampleCouponDraft[key] !== undefined &&
        sampleCouponDraft[key] !== sampleCouponAmounts?.[key],
    );
  const hasTokenChanges = (tokenSettings ?? []).some((tier) => {
    const draft = tokenDraft[tier.priceKey];
    return (
      draft && (draft.price !== tier.price || draft.amount !== tier.amount)
    );
  });

  const handleTabChange = (value: string) => {
    if (!PRICING_TABS.has(value as PricingTab)) return;

    const nextTab = value as PricingTab;
    setActiveTab(nextTab);

    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("tab", nextTab);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const renderConstantInput = (
    key: string,
    suffix: string,
    step = 100,
    min = 0,
  ) => {
    const row = constantsMap.get(key);
    if (!row) return null;

    const label = CONSTANT_LABELS[key] ?? key;
    return (
      <PricingNumberField
        key={key}
        fieldKey={key}
        label={label}
        value={constantDraft[key] ?? row.amount}
        min={min}
        step={step}
        suffix={suffix}
        errorMessage={fieldErrors[key]}
        inputRef={registerFieldRef(key)}
        onChange={(value) => {
          clearFieldError(key);
          setConstantDraft((prev) => ({ ...prev, [key]: value }));
        }}
      />
    );
  };

  if (constantsQuery.isLoading || fabricsQuery.isLoading) {
    return (
      <main className="pricingPage adminSettingsPage">
        가격 정보를 불러오는 중…
      </main>
    );
  }

  if (constantsQuery.isError || fabricsQuery.isError) {
    return (
      <main className="pricingPage adminSettingsPage">
        <Callout
          tone="critical"
          title="가격 정보를 불러오지 못했습니다"
          description={loadError?.message ?? "알 수 없는 오류"}
          role="alert"
        />
      </main>
    );
  }

  return (
    <main className="pricingPage adminSettingsPage">
      <header className="pricingHeader">
        <h1 className="pricingTitle">가격 설정</h1>
        <p className="pricingDescription">
          주문/수선/원단/샘플/토큰 가격 기준을 관리합니다.
        </p>
      </header>

      {notice ? (
        <Callout
          tone={notice.tone}
          description={notice.message}
          role={notice.tone === "critical" ? "alert" : "status"}
          aria-live={notice.tone === "positive" ? "polite" : undefined}
        />
      ) : null}

      <section
        className="pricingPanel adminSettingsCard"
        aria-labelledby="pricing-panel-title"
      >
        <div className="pricingPanelHeader">
          <h2 id="pricing-panel-title" className="pricingPanelTitle">
            가격 항목
          </h2>
        </div>
        <TabsRoot value={activeTab} onValueChange={handleTabChange}>
          <TabsList
            className="pricingTabList"
            aria-label="가격 설정 영역"
            aria-describedby="pricing-tab-status-legend"
          >
            <TabsTrigger
              value="sewing"
              notification={hasConstantChanges(allSewingKeys)}
            >
              봉제
            </TabsTrigger>
            <TabsTrigger
              value="reform"
              notification={hasConstantChanges(REFORM_KEYS)}
            >
              수선
            </TabsTrigger>
            <TabsTrigger value="fabric" notification={hasFabricChanges}>
              원단
            </TabsTrigger>
            <TabsTrigger
              value="sample"
              notification={Boolean(
                hasSampleChanges || sampleCouponQuery.isError,
              )}
            >
              샘플
            </TabsTrigger>
            <TabsTrigger
              value="token"
              notification={Boolean(hasTokenChanges || tokenQuery.isError)}
            >
              토큰
            </TabsTrigger>
          </TabsList>
          <p id="pricing-tab-status-legend" className="pricingTabLegend">
            탭의 점: 오류 또는 저장하지 않은 변경사항
          </p>

          <TabsContent value="sewing">
            <div className="pricingStack">
              {SEWING_GROUPS.map((group) => (
                <section key={group.title} className="pricingGroup">
                  <h3 className="pricingGroupTitle">{group.title}</h3>
                  <div className="pricingGrid">
                    {group.keys.map((key) => renderConstantInput(key, "원"))}
                  </div>
                </section>
              ))}
              <section className="pricingGroup">
                <h3 className="pricingGroupTitle">원단 수량</h3>
                <div className="pricingGrid">
                  {FABRIC_QTY_KEYS.map((key) =>
                    renderConstantInput(key, "장/마", 1, 1),
                  )}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="reform">
            <div className="pricingGrid">
              {REFORM_KEYS.map((key) => renderConstantInput(key, "원"))}
            </div>
          </TabsContent>

          <TabsContent value="fabric">
            <div className="pricingGrid">
              {(fabrics ?? []).map((row) => {
                const { designType, fabricType } = parseFabricKey(row.key);
                const label = `${DESIGN_TYPE_LABELS[designType] ?? designType} / ${FABRIC_TYPE_LABELS[fabricType] ?? fabricType}`;
                return (
                  <PricingNumberField
                    key={row.key}
                    fieldKey={row.key}
                    label={label}
                    value={fabricDraft[row.key] ?? row.amount}
                    suffix="원"
                    errorMessage={fieldErrors[row.key]}
                    inputRef={registerFieldRef(row.key)}
                    onChange={(value) => {
                      clearFieldError(row.key);
                      setFabricDraft((prev) => ({ ...prev, [row.key]: value }));
                    }}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="sample">
            <div className="pricingStack">
              <section className="pricingGroup">
                <h3 className="pricingGroupTitle">샘플 가격</h3>
                <div className="pricingGrid">
                  {SAMPLE_KEYS.map((key) =>
                    renderConstantInput(key, "원", 1000),
                  )}
                </div>
              </section>
              <section className="pricingGroup">
                <h3 className="pricingGroupTitle">샘플 결제 시 지급 쿠폰</h3>
                <p className="pricingMutedText">
                  이 값은 시스템 설정으로 관리됩니다. 쿠폰 관리 페이지에서
                  별도로 수정하지 마세요.
                </p>
                {sampleCouponQuery.isLoading ? (
                  <p>샘플 쿠폰 금액을 불러오는 중…</p>
                ) : null}
                {sampleCouponQuery.isError ? (
                  <Callout
                    tone="critical"
                    description={
                      sampleCouponQuery.error?.message ??
                      "샘플 쿠폰 금액 정보를 불러오는데 실패했습니다."
                    }
                    role="alert"
                  />
                ) : (
                  <div className="pricingGrid">
                    {SAMPLE_DISCOUNT_KEYS.map((key) => (
                      <PricingNumberField
                        key={key}
                        fieldKey={key}
                        label={SAMPLE_COUPON_LABELS[key] ?? key}
                        value={
                          sampleCouponDraft[key] ??
                          (sampleCouponQuery.isSuccess
                            ? (sampleCouponAmounts?.[key] ?? 0)
                            : undefined)
                        }
                        step={1000}
                        suffix="원"
                        disabled={!sampleCouponQuery.isSuccess}
                        errorMessage={fieldErrors[key]}
                        inputRef={registerFieldRef(key)}
                        onChange={(value) => {
                          clearFieldError(key);
                          setSampleCouponDraft((prev) => ({
                            ...prev,
                            [key]: value,
                          }));
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="token">
            {tokenQuery.isLoading ? <p>토큰 가격 정보를 불러오는 중…</p> : null}
            {tokenQuery.isError ? (
              <Callout
                tone="critical"
                description={
                  tokenQuery.error?.message ??
                  "토큰 가격 정보를 불러오는데 실패했습니다."
                }
                role="alert"
              />
            ) : (
              <div className="pricingStack">
                <p className="pricingMutedText">
                  많이 살수록 토큰 1개당 단가가 낮아집니다.
                </p>
                <div className="pricingGrid">
                  {TOKEN_PRICING_TIERS.map(({ label, priceKey, amountKey }) => {
                    const tier =
                      tokenDraft[priceKey] ??
                      tokenSettings?.find((item) => item.priceKey === priceKey);
                    const setTier = (patch: Partial<TokenTierUI>) => {
                      clearFieldError(
                        patch.price === undefined ? amountKey : priceKey,
                      );
                      setTokenDraft((prev) => ({
                        ...prev,
                        [priceKey]: {
                          label,
                          priceKey,
                          amountKey,
                          price: prev[priceKey]?.price ?? tier?.price ?? 0,
                          amount: prev[priceKey]?.amount ?? tier?.amount ?? 0,
                          ...patch,
                        },
                      }));
                    };
                    return (
                      <section key={priceKey} className="pricingTierCard">
                        <h3 className="pricingTierTitle">
                          {tier?.label ?? label}
                        </h3>
                        <PricingNumberField
                          fieldKey={priceKey}
                          label="가격"
                          value={tier?.price}
                          min={1}
                          suffix="원"
                          errorMessage={fieldErrors[priceKey]}
                          inputRef={registerFieldRef(priceKey)}
                          onChange={(value) => setTier({ price: value })}
                        />
                        <PricingNumberField
                          fieldKey={amountKey}
                          label="토큰 수량"
                          value={tier?.amount}
                          min={1}
                          step={1}
                          suffix="T"
                          errorMessage={fieldErrors[amountKey]}
                          inputRef={registerFieldRef(amountKey)}
                          onChange={(value) => setTier({ amount: value })}
                        />
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </TabsRoot>

        <div className="pricingPanelActions adminSettingsActionRow">
          {hasPendingChanges ? (
            <p
              className="pricingSaveSummary adminSettingsActionSummary"
              aria-live="polite"
            >
              {saveSummary}
            </p>
          ) : null}
          {hasPendingChanges ? (
            <ActionButton
              type="button"
              variant="neutralWeak"
              disabled={isSaving}
              onClick={resetDrafts}
            >
              변경 취소
            </ActionButton>
          ) : null}
          <ActionButton
            type="button"
            onClick={() => void saveAll()}
            loading={isSaving}
            disabled={isSaving || !hasPendingChanges}
          >
            {saveButtonLabel}
          </ActionButton>
        </div>
      </section>
    </main>
  );
}
