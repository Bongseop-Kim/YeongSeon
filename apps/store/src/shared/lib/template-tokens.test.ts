import { applyTemplateTokens } from "@/shared/lib/template-tokens";

describe("applyTemplateTokens", () => {
  it("토큰을 매핑된 값으로 치환한다", () => {
    const result = applyTemplateTokens(
      "수선 상품: {{REFORM_SHIPPING_COST}}원",
      {
        REFORM_SHIPPING_COST: "4,500",
      },
    );

    expect(result).toBe("수선 상품: 4,500원");
  });

  it("여러 토큰을 모두 치환한다", () => {
    const result = applyTemplateTokens("{{A}} / {{B}}", { A: "1", B: "2" });

    expect(result).toBe("1 / 2");
  });

  it("매핑이 없는 토큰은 fallback으로 대체한다", () => {
    const result = applyTemplateTokens(
      "수선 상품: {{REFORM_SHIPPING_COST}}원",
      {},
    );

    expect(result).toBe("수선 상품: —원");
  });

  it("fallback을 지정할 수 있다", () => {
    const result = applyTemplateTokens("{{X}}", {}, "안내 예정");

    expect(result).toBe("안내 예정");
  });

  it("토큰이 없는 텍스트는 그대로 반환한다", () => {
    const text = "일반 상품: 무료 배송";

    expect(applyTemplateTokens(text, { REFORM_SHIPPING_COST: "4,500" })).toBe(
      text,
    );
  });
});
