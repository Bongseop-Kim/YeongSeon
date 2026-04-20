import { assertEquals } from "jsr:@std/assert@1.0.19";
import { needsUpscale } from "@/functions/_shared/preprocessing/upscale.ts";

Deno.test("needsUpscale returns true when min dimension < 512", () => {
  assertEquals(needsUpscale({ width: 400, height: 800 }), true);
  assertEquals(needsUpscale({ width: 800, height: 400 }), true);
});

Deno.test("needsUpscale returns false when both dimensions >= 512", () => {
  assertEquals(needsUpscale({ width: 512, height: 512 }), false);
  assertEquals(needsUpscale({ width: 1024, height: 768 }), false);
});

Deno.test("needsUpscale returns true for degenerate tiny inputs", () => {
  assertEquals(needsUpscale({ width: 0, height: 0 }), true);
});
