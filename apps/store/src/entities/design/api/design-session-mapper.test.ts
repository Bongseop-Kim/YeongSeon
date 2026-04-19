import { describe, expect, it } from "vitest";
import {
  toDesignSession,
  toDesignSessionMessage,
} from "@/entities/design/api/design-session-mapper";

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
        last_image_work_id: "work-1",
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
      lastImageWorkId: "work-1",
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
        last_image_work_id: null,
        image_count: 0,
        created_at: "2026-03-19T10:00:00Z",
        updated_at: "2026-03-19T10:00:00Z",
      }),
    ).toMatchObject({
      lastImageUrl: null,
      lastImageFileId: null,
      lastImageWorkId: null,
    });
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
