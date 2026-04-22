import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  buildSessionMessages,
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
