import { assertEquals } from "jsr:@std/assert@1.0.19";
import { assertRejects } from "jsr:@std/assert@1.0.19";
import {
  buildSessionMessages,
  saveDesignSession,
  type SessionMessage,
} from "@/functions/_shared/session-save.ts";

Deno.test(
  "buildSessionMessages sanitizes untrusted attachments before persisting",
  () => {
    const result = buildSessionMessages(
      [
        {
          id: "user-1",
          role: "user",
          content: "참고 이미지를 반영해줘",
          imageUrl: null,
          imageFileId: null,
          attachments: [
            {
              type: "image",
              id: "attachment-1",
              url: "https://example.com/reference.png",
              filename: "reference.png",
              nested: { unexpected: true },
            },
          ] as never,
          sequenceNumber: 0,
        },
      ],
      {
        id: "ai-1",
        role: "ai",
        content: "반영했습니다.",
        image_url: null,
        image_file_id: null,
        attachments: null,
        sequence_number: 1,
      } satisfies SessionMessage,
    );

    assertEquals(result[0]?.attachments, [
      {
        type: "image",
        id: "attachment-1",
        url: "https://example.com/reference.png",
        filename: "reference.png",
      },
    ]);
  },
);

Deno.test(
  "buildSessionMessages serializes missing attachments as arrays for database constraints",
  () => {
    const result = buildSessionMessages(
      [
        {
          id: "user-1",
          role: "user",
          content: "첨부 없이 생성해줘",
          imageUrl: null,
          imageFileId: null,
          attachments: undefined,
          sequenceNumber: 0,
        },
      ],
      {
        id: "ai-1",
        role: "ai",
        content: "생성했습니다.",
        image_url: "https://example.com/tile.png",
        image_file_id: null,
        attachments: null,
        sequence_number: 1,
      } satisfies SessionMessage,
    );

    assertEquals(result[0]?.attachments, []);
    assertEquals(result[1]?.attachments, []);
  },
);

Deno.test(
  "saveDesignSession rejects when requireSuccess is enabled and RPC fails",
  async () => {
    const client = {
      rpc: () =>
        Promise.resolve({
          error: { message: "violates foreign key constraint" },
        }),
    };

    await assertRejects(
      () =>
        saveDesignSession(
          client as never,
          {
            sessionId: "session-1",
            aiModel: "openai",
            firstMessage: "첫 요청",
            messages: [],
          },
          { requireSuccess: true },
        ),
      Error,
      "save_design_session RPC 실패: violates foreign key constraint",
    );
  },
);

Deno.test("saveDesignSession sends attachment fields as arrays", async () => {
  let rpcPayload: { p_messages?: unknown } | undefined;
  const client = {
    rpc: (_fn: string, payload: Record<string, unknown>) => {
      rpcPayload = payload;
      return Promise.resolve({ error: null });
    },
  };

  await saveDesignSession(client as never, {
    sessionId: "session-1",
    aiModel: "openai",
    firstMessage: "첫 요청",
    messages: [
      {
        id: "ai-1",
        role: "ai",
        content: "생성했습니다.",
        image_url: "https://example.com/tile.png",
        image_file_id: null,
        attachments: null,
        sequence_number: 0,
      },
    ],
  });

  assertEquals(
    (rpcPayload?.p_messages as SessionMessage[] | undefined)?.[0]?.attachments,
    [],
  );
});
