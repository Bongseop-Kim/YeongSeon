import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQuoteRequest } from "@/entities/quote-request/api/quote-request-api";

const { fromMock, selectMock, eqMock, maybeSingleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

describe("getQuoteRequest", () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    maybeSingleMock.mockReset();

    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
  });

  it("businessName 컬럼이 없는 legacy view에서는 contactTitle로 재조회한다", async () => {
    maybeSingleMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "42703",
          message:
            "column quote_request_detail_view.businessName does not exist",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "quote-1",
          quoteNumber: "Q-001",
          date: "2026-05-18",
          status: "요청",
          options: {},
          quantity: 100,
          referenceImages: [],
          additionalNotes: "",
          contactName: "홍길동",
          contactTitle: "영선산업",
          contactMethod: "phone",
          contactValue: "010-0000-0000",
          quotedAmount: null,
          quoteConditions: null,
          created_at: "2026-05-18T00:00:00Z",
        },
        error: null,
      });

    await expect(getQuoteRequest("quote-1")).resolves.toMatchObject({
      id: "quote-1",
      businessName: "영선산업",
    });

    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(selectMock.mock.calls[0]?.[0]).toContain('"businessName"');
    expect(selectMock.mock.calls[1]?.[0]).toContain('"contactTitle"');
    expect(eqMock).toHaveBeenCalledWith("id", "quote-1");
  });
});
