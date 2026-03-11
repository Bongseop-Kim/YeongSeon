import { describe, it } from "vitest";
import type { ClaimTypeDTO, ClaimListRowDTO } from "./claim-view";

describe("ClaimTypeDTO", () => {
  it("token_refund 타입을 포함한다", () => {
    // 컴파일 타임 검증: ClaimTypeDTO에 token_refund 할당 가능
    const _: ClaimTypeDTO = "token_refund";
    void _;
  });
});

describe("ClaimListRowDTO", () => {
  it("refund_data 필드를 가진다", () => {
    // 컴파일 타임 검증: refund_data가 ClaimListRowDTO의 키
    const _: keyof ClaimListRowDTO = "refund_data";
    void _;
  });
});
