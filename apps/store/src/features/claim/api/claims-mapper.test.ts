import { describe, expect, it } from "vitest";
import { parseClaimListRows } from "@/features/claim/api/claims-mapper";
import { createClaimListRowRaw } from "@/test/fixtures";

describe("parseClaimListRows", () => {
  it("null 입력은 빈 배열을 반환한다", () => {
    expect(parseClaimListRows(null)).toEqual([]);
  });

  it("cancel 클레임의 product 아이템을 파싱한다", () => {
    expect(parseClaimListRows([createClaimListRowRaw()])[0]).toEqual(
      expect.objectContaining({
        id: "claim-1",
        type: "cancel",
        item: expect.objectContaining({
          type: "product",
          product: expect.objectContaining({ id: 1 }),
        }),
      }),
    );
  });

  it("return 클레임의 reform 아이템을 파싱한다", () => {
    expect(
      parseClaimListRows([
        createClaimListRowRaw({
          type: "return",
          item: {
            id: "item-2",
            type: "reform",
            quantity: 1,
            product: null,
            selectedOption: null,
            reformData: {
              cost: 15000,
              tie: {
                id: "tie-1",
                image: "image.jpg",
                measurementType: "length",
                tieLength: 145,
              },
            },
            appliedCoupon: null,
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "return",
        item: expect.objectContaining({
          type: "reform",
          reformData: expect.objectContaining({ cost: 15000 }),
        }),
      }),
    );
  });

  it("exchange 클레임의 custom 아이템을 customData로 파싱한다", () => {
    expect(
      parseClaimListRows([
        createClaimListRowRaw({
          type: "exchange",
          item: {
            id: "item-3",
            type: "custom",
            quantity: 1,
            product: null,
            selectedOption: null,
            reformData: null,
            customData: {
              options: {
                tie_type: "3fold",
              },
              pricing: {
                sewing_cost: 12000,
                fabric_cost: 8000,
                total_cost: 20000,
              },
            },
            appliedCoupon: null,
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "exchange",
        item: expect.objectContaining({
          type: "custom",
          customData: expect.objectContaining({
            options: expect.objectContaining({
              tieType: "3fold",
            }),
            pricing: expect.objectContaining({
              sewingCost: 12000,
              fabricCost: 8000,
              totalCost: 20000,
            }),
            sample: false,
            sampleType: null,
            referenceImageUrls: [],
            additionalNotes: null,
          }),
        }),
      }),
    );
  });

  it("token_refund 클레임의 refund_data를 파싱한다", () => {
    expect(
      parseClaimListRows([
        createClaimListRowRaw({
          type: "token_refund",
          item: {
            id: "item-4",
            type: "token",
            quantity: 1,
            product: null,
            selectedOption: null,
            reformData: null,
            customData: null,
            appliedCoupon: null,
          },
          refund_data: {
            paid_token_amount: 10,
            bonus_token_amount: 5,
            refund_amount: 15000,
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "token_refund",
        item: expect.objectContaining({ type: "token" }),
        refund_data: {
          paid_token_amount: 10,
          bonus_token_amount: 5,
          refund_amount: 15000,
        },
      }),
    );
  });

  describe("에러 케이스", () => {
    it("custom 타입에서 customData가 없으면 에러를 던진다", () => {
      expect(() =>
        parseClaimListRows([
          createClaimListRowRaw({
            item: {
              id: "item-3",
              type: "custom",
              quantity: 1,
              product: null,
              selectedOption: null,
              reformData: null,
              customData: null,
              appliedCoupon: null,
            },
          }),
        ]),
      ).toThrow('type이 "custom"인 경우 customData 필드가 있어야 합니다.');
    });

    it("refund_data 필수 값이 없으면 에러를 던진다", () => {
      expect(() =>
        parseClaimListRows([
          createClaimListRowRaw({
            type: "token_refund",
            refund_data: {
              paid_token_amount: 10,
            },
          }),
        ]),
      ).toThrow("refund_data 필수 필드 누락.");
    });
  });
});
