import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import { hexToRgb } from "@/functions/_shared/color.ts";

Deno.test("hexToRgb parses a valid normalized hex color", () => {
  assertEquals(hexToRgb("#aabbcc"), [0xaa, 0xbb, 0xcc]);
});

Deno.test("hexToRgb rejects invalid hex colors", () => {
  const error = assertThrows(() => hexToRgb("#xyz"), Error);
  assertEquals(error.message, "Invalid hex color");
});
