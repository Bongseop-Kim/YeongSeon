import { describe, expect, it } from "vitest";
import { toDesignImage } from "@/entities/design/api/design-image-mapper";

describe("toDesignImage", () => {
  it("row를 DesignImage 타입으로 변환한다", () => {
    expect(
      toDesignImage({
        id: "variant-1",
        repeat_tile_url: "https://cdn.example.com/img.png",
        created_at: "2026-04-01T10:00:00Z",
        design_generations: { prompt: "파란 넥타이" },
      }),
    ).toEqual({
      imageUrl: "https://cdn.example.com/img.png",
      imageFileId: null,
      createdAt: "2026-04-01T10:00:00Z",
      sessionFirstMessage: "파란 넥타이",
    });
  });

  it("generation 정보가 null이면 sessionFirstMessage를 빈 문자열로 반환한다", () => {
    expect(
      toDesignImage({
        id: "variant-2",
        repeat_tile_url: "https://cdn.example.com/img2.png",
        created_at: "2026-04-02T10:00:00Z",
        design_generations: null,
      }),
    ).toMatchObject({ sessionFirstMessage: "" });
  });
});
