import { describe, it, expectTypeOf } from "vitest";
import type { ClaimTypeDTO, ClaimListRowDTO } from "./claim-view";

describe("ClaimTypeDTO", () => {
  it("token_refund 타입을 포함한다", () => {
    expectTypeOf<ClaimTypeDTO>().toEqualTypeOf<
      "cancel" | "return" | "exchange" | "token_refund"
    >();
  });
});

describe("ClaimListRowDTO", () => {
  it("refund_data 필드를 가진다", () => {
    expectTypeOf<ClaimListRowDTO>().toHaveProperty("refund_data");
  });
});
