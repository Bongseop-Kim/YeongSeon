import { describe, expect, it } from "vitest";
import {
  toDesignSession,
  toDesignSessionMessage,
} from "@/entities/design/api/design-session-mapper";
import type { DesignSessionRow } from "@/entities/design/api/design-session-mapper";

const createSessionRow = (
  overrides: Partial<DesignSessionRow>,
): DesignSessionRow => ({
  id: "session-1",
  user_id: "user-1",
  ai_model: "openai",
  first_message: "넥타이 디자인",
  last_image_url: null,
  last_image_file_id: null,
  last_image_work_id: null,
  repeat_tile_url: null,
  repeat_tile_work_id: null,
  accent_tile_url: null,
  accent_tile_work_id: null,
  accent_layout_json: null,
  pattern_type: null,
  fabric_type: null,
  image_count: 0,
  created_at: "2026-03-19T10:00:00Z",
  updated_at: "2026-03-19T10:00:00Z",
  ...overrides,
});

describe("toDesignSession", () => {
  it("snake_case row를 DesignSession UI 타입으로 변환한다", () => {
    expect(
      toDesignSession(
        createSessionRow({
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
      ),
    ).toEqual({
      id: "session-1",
      aiModel: "openai",
      firstMessage: "넥타이 디자인",
      lastImageUrl: "https://ik.imagekit.io/essesion/design-sessions/img.png",
      lastImageFileId: "file-1",
      lastImageWorkId: "work-1",
      repeatTileUrl: null,
      repeatTileWorkId: null,
      accentTileUrl: null,
      accentTileWorkId: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
      imageCount: 2,
      createdAt: "2026-03-19T10:00:00Z",
      updatedAt: "2026-03-19T10:05:00Z",
    });
  });

  it("last_image_url이 null이면 null로 유지한다", () => {
    expect(
      toDesignSession(
        createSessionRow({
          id: "session-2",
          user_id: "user-1",
          ai_model: "openai",
          first_message: "첫 메시지",
          last_image_url: null,
          last_image_file_id: null,
          last_image_work_id: null,
          image_count: 0,
          created_at: "2026-03-19T10:00:00Z",
          updated_at: "2026-03-19T10:00:00Z",
        }),
      ),
    ).toMatchObject({
      lastImageUrl: null,
      lastImageFileId: null,
      lastImageWorkId: null,
    });
  });

  it("fal 세션도 DesignSession UI 타입으로 변환한다", () => {
    expect(
      toDesignSession(
        createSessionRow({
          id: "session-3",
          user_id: "user-1",
          ai_model: "fal",
          first_message: "CI 패턴으로 올오버 생성",
          last_image_url: "https://example.com/fal.png",
          last_image_file_id: "file-3",
          last_image_work_id: "work-3",
          image_count: 1,
          created_at: "2026-03-19T10:10:00Z",
          updated_at: "2026-03-19T10:15:00Z",
        }),
      ),
    ).toMatchObject({
      id: "session-3",
      aiModel: "fal",
      firstMessage: "CI 패턴으로 올오버 생성",
    });
  });

  it("accent_layout_json을 accentLayout으로 변환한다", () => {
    expect(
      toDesignSession(
        createSessionRow({
          accent_layout_json: {
            objectDescription: "브랜드 로고",
            objectSource: "text",
            color: "navy",
            size: "medium",
          },
        }),
      ),
    ).toMatchObject({
      accentLayout: {
        objectDescription: "브랜드 로고",
        objectSource: "text",
        color: "navy",
        size: "medium",
      },
    });
  });

  it("잘못된 accent_layout_json은 null로 변환한다", () => {
    expect(
      toDesignSession(
        createSessionRow({
          accent_layout_json: {
            objectDescription: "브랜드 로고",
            objectSource: "invalid",
            color: "navy",
            size: "medium",
          },
        }),
      ),
    ).toMatchObject({
      accentLayout: null,
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
        attachments: [
          {
            type: "image",
            label: "참고 이미지",
            value: "reference",
            fileName: "mood-board.png",
          },
        ],
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
      attachments: [
        {
          type: "image",
          label: "참고 이미지",
          value: "reference",
          fileName: "mood-board.png",
        },
      ],
      sequenceNumber: 2,
      createdAt: "2026-03-19T10:05:00Z",
    });
  });
});
