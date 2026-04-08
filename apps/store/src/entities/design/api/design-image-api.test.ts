import { describe, expect, it } from "vitest";
import { toDesignImage } from "@/entities/design/api/design-image-mapper";

describe("toDesignImage", () => {
  it("row를 DesignImage 타입으로 변환한다", () => {
    expect(
      toDesignImage({
        image_url: "https://cdn.example.com/img.png",
        image_file_id: "file-1",
        created_at: "2026-04-01T10:00:00Z",
        design_chat_sessions: { first_message: "파란 넥타이" },
      }),
    ).toEqual({
      imageUrl: "https://cdn.example.com/img.png",
      imageFileId: "file-1",
      createdAt: "2026-04-01T10:00:00Z",
      sessionFirstMessage: "파란 넥타이",
    });
  });

  it("세션 정보가 null이면 sessionFirstMessage를 빈 문자열로 반환한다", () => {
    expect(
      toDesignImage({
        image_url: "https://cdn.example.com/img2.png",
        image_file_id: "file-2",
        created_at: "2026-04-02T10:00:00Z",
        design_chat_sessions: null,
      }),
    ).toMatchObject({ sessionFirstMessage: "" });
  });
});
