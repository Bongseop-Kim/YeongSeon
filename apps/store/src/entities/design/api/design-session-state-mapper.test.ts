import { describe, expect, it } from "vitest";
import { toRestoredDesignSessionState } from "@/entities/design/api/design-session-state-mapper";

describe("toRestoredDesignSessionState", () => {
  it("빈 문자열 image 필드를 보존한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "ai",
          content: "이미지 없음",
          imageUrl: "",
          imageFileId: "",
          attachments: null,
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
      ]).messages[0],
    ).toMatchObject({
      id: "msg-1",
      imageUrl: "",
      imageFileId: "",
    });
  });

  it("세션 복원 상태는 baseImageWorkId를 null로 초기화한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "ai",
          content: "첫 이미지",
          imageUrl: "https://example.com/first.png",
          imageFileId: "file-1",
          attachments: null,
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
      ]).baseImageWorkId,
    ).toBeNull();
  });

  it("세션 메시지의 attachments를 복원 상태 메시지에 유지한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "user",
          content: "이런 이미지로",
          imageUrl: null,
          imageFileId: null,
          attachments: [
            {
              type: "image",
              label: "참고 이미지",
              value: "reference",
              fileName: "mood-board.png",
            },
          ],
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
      ]).messages[0].attachments,
    ).toEqual([
      {
        type: "image",
        label: "참고 이미지",
        value: "reference",
        fileName: "mood-board.png",
      },
    ]);
  });
});
