import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  sanitizeLogRequestAttachments,
  sanitizeSessionAttachments,
} from "@/functions/_shared/request-attachments.ts";

Deno.test(
  "sanitizeLogRequestAttachments filters invalid entries and trims oversized fields",
  () => {
    const sanitized = sanitizeLogRequestAttachments([
      {
        type: "image",
        label: `  ${"a".repeat(300)}  `,
        value: " reference ",
        fileName: "mood-board.png",
        binary: "ignored",
      },
      {
        type: "invalid",
        label: "bad",
        value: "bad",
      },
    ]);

    assertEquals(sanitized, [
      {
        type: "image",
        label: "a".repeat(120),
        value: "reference",
        fileName: "mood-board.png",
      },
    ]);
  },
);

Deno.test(
  "sanitizeSessionAttachments keeps only whitelisted metadata fields",
  () => {
    const sanitized = sanitizeSessionAttachments([
      {
        type: "image",
        id: "attachment-1",
        url: "https://example.com/reference.png",
        filename: "reference.png",
        nested: { unexpected: true },
      },
    ]);

    assertEquals(sanitized, [
      {
        type: "image",
        id: "attachment-1",
        url: "https://example.com/reference.png",
        filename: "reference.png",
      },
    ]);
  },
);
