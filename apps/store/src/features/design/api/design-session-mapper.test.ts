import { describe, expect, it } from "vitest";
import {
  toRestoredDesignSessionState,
  toDesignSession,
  toDesignSessionMessage,
} from "@/features/design/api/design-session-mapper";

describe("toDesignSession", () => {
  it("snake_case row를 DesignSession UI 타입으로 변환한다", () => {
    expect(
      toDesignSession({
        id: "session-1",
        user_id: "user-1",
        ai_model: "openai",
        first_message: "넥타이 디자인",
        last_image_url:
          "https://ik.imagekit.io/essesion/design-sessions/img.png",
        last_image_file_id: "file-1",
        image_count: 2,
        created_at: "2026-03-19T10:00:00Z",
        updated_at: "2026-03-19T10:05:00Z",
      }),
    ).toEqual({
      id: "session-1",
      aiModel: "openai",
      firstMessage: "넥타이 디자인",
      lastImageUrl: "https://ik.imagekit.io/essesion/design-sessions/img.png",
      lastImageFileId: "file-1",
      imageCount: 2,
      createdAt: "2026-03-19T10:00:00Z",
      updatedAt: "2026-03-19T10:05:00Z",
    });
  });

  it("last_image_url이 null이면 null로 유지한다", () => {
    expect(
      toDesignSession({
        id: "session-2",
        user_id: "user-1",
        ai_model: "gemini",
        first_message: "첫 메시지",
        last_image_url: null,
        last_image_file_id: null,
        image_count: 0,
        created_at: "2026-03-19T10:00:00Z",
        updated_at: "2026-03-19T10:00:00Z",
      }),
    ).toMatchObject({ lastImageUrl: null, lastImageFileId: null });
  });
});

describe("toDesignSessionMessage", () => {
  it("snake_case row를 DesignSessionMessage UI 타입으로 변환한다", () => {
    expect(
      toDesignSessionMessage({
        id: "msg-1",
        session_id: "session-1",
        role: "ai",
        content: "생성했습니다",
        image_url: "https://ik.imagekit.io/essesion/design-sessions/img.png",
        image_file_id: "file-1",
        sequence_number: 2,
        created_at: "2026-03-19T10:05:00Z",
      }),
    ).toEqual({
      id: "msg-1",
      sessionId: "session-1",
      role: "ai",
      content: "생성했습니다",
      imageUrl: "https://ik.imagekit.io/essesion/design-sessions/img.png",
      imageFileId: "file-1",
      sequenceNumber: 2,
      createdAt: "2026-03-19T10:05:00Z",
    });
  });
});

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
          rawImageUrl: undefined,
          timestamp: new Date("2026-03-19T10:00:00Z").getTime(),
        },
        {
          id: "msg-2",
          role: "ai",
          content: "시안을 만들었습니다.",
          imageUrl:
            'url("https://example.com/design.png") center/cover no-repeat',
          rawImageUrl: "https://example.com/design.png",
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
