import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  sanitizeLogRequestAttachments,
  sanitizeSessionAttachments,
} from "@/functions/_shared/request-attachments.ts";

const withCharacterCode = (code: number) =>
  `bad${String.fromCharCode(code)}name.png`;

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

Deno.test(
  "sanitizeLogRequestAttachments rejects filenames with DEL and C1 control characters",
  () => {
    const sanitized = sanitizeLogRequestAttachments([
      {
        type: "image",
        label: "reference",
        value: "https://example.com/reference.png",
        fileName: withCharacterCode(0x7f),
      },
      {
        type: "image",
        label: "reference-2",
        value: "https://example.com/reference-2.png",
        fileName: withCharacterCode(0x85),
      },
    ]);

    assertEquals(sanitized, [
      {
        type: "image",
        label: "reference",
        value: "https://example.com/reference.png",
      },
      {
        type: "image",
        label: "reference-2",
        value: "https://example.com/reference-2.png",
      },
    ]);
  },
);

Deno.test(
  "sanitizeSessionAttachments strips DEL and C1 control characters from filenames",
  () => {
    const sanitized = sanitizeSessionAttachments([
      {
        type: "image",
        filename: withCharacterCode(0x7f),
        fileName: withCharacterCode(0x81),
      },
    ]);

    assertEquals(sanitized, [
      {
        type: "image",
      },
    ]);
  },
);
