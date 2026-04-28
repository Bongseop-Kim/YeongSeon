import { describe, expect, it } from "vitest";
import { toRestoredDesignSessionState } from "@/entities/design/api/design-session-state-mapper";

describe("toRestoredDesignSessionState", () => {
  it("메시지의 image 필드는 채팅 메시지에만 보존한다", () => {
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
      ]),
    ).toMatchObject({
      messages: [
        {
          id: "msg-1",
          imageUrl: "",
          imageFileId: "",
        },
      ],
      generatedImageUrl: null,
      generationStatus: "idle",
    });
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

  it("사용자 attachment 히스토리를 replay해 designContext를 복원한다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "user",
          content: "네이비 체크로 해줘",
          imageUrl: null,
          imageFileId: null,
          attachments: [
            {
              type: "color",
              label: "네이비",
              value: "#112233",
            },
            {
              type: "pattern",
              label: "체크",
              value: "check",
            },
          ],
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
        {
          id: "msg-2",
          sessionId: "session-1",
          role: "user",
          content: "원포인트, 날염으로 바꿔줘",
          imageUrl: null,
          imageFileId: null,
          attachments: [
            {
              type: "fabric",
              label: "날염",
              value: "print",
            },
            {
              type: "ci-placement",
              label: "원포인트",
              value: "one-point",
            },
          ],
          sequenceNumber: 1,
          createdAt: "2026-03-19T10:01:00Z",
        },
      ]).designContext,
    ).toEqual({
      colors: ["#112233"],
      pattern: "check",
      fabricMethod: "print",
      ciPlacement: "one-point",
    });
  });

  it("이미지 메시지가 있어도 레거시 프리뷰 상태로 복원하지 않는다", () => {
    expect(
      toRestoredDesignSessionState([
        {
          id: "msg-1",
          sessionId: "session-1",
          role: "ai",
          content: "이전 이미지",
          imageUrl: "https://example.com/legacy.png",
          imageFileId: "file-1",
          attachments: null,
          sequenceNumber: 0,
          createdAt: "2026-03-19T10:00:00Z",
        },
      ]),
    ).toMatchObject({
      generatedImageUrl: null,
      generationStatus: "idle",
    });
  });
});
