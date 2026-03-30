import { describe, expect, it } from "vitest";
import { toRestoredDesignSessionState } from "@/entities/design";

describe("toRestoredDesignSessionState", () => {
  it("마지막 이미지 메시지를 프리뷰 상태로 복원한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "user",
          content: "네이비 스트라이프",
          imageUrl: null,
          imageFileId: null,
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
        {
          id: "msg-2",
          sessionId: "session-1",
          role: "ai",
          content: "시안을 만들었습니다.",
          imageUrl: "https://example.com/design.png",
          imageFileId: "file-1",
          sequenceNumber: 1,
          createdAt: "2026-03-19T10:01:00Z",
        },
      ]),
    ).toEqual({
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "네이비 스트라이프",
          imageUrl: undefined,
          timestamp: new Date("2026-03-19T10:00:00Z").getTime(),
        },
        {
          id: "msg-2",
          role: "ai",
          content: "시안을 만들었습니다.",
          imageUrl: "https://example.com/design.png",
          timestamp: new Date("2026-03-19T10:01:00Z").getTime(),
        },
      ],
      generatedImageUrl:
        'url("https://example.com/design.png") center/cover no-repeat',
      resultTags: [],
      generationStatus: "completed",
    });
  });

  it("이미지가 없는 세션은 프리뷰를 비우고 idle 상태로 복원한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-2",
          role: "user",
          content: "텍스트만 있는 세션",
          imageUrl: null,
          imageFileId: null,
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
      ]),
    ).toMatchObject({
      generatedImageUrl: null,
      resultTags: [],
      generationStatus: "idle",
    });
  });
});
