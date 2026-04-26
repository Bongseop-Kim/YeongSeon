import { assertEquals } from "jsr:@std/assert";
import { validateReferenceImageUrl } from "./image-generator.ts";

Deno.test("validateReferenceImageUrl accepts HTTPS ImageKit URLs", () => {
  assertEquals(
    validateReferenceImageUrl("https://ik.imagekit.io/app/logo.png"),
    "https://ik.imagekit.io/app/logo.png",
  );
});

Deno.test(
  "validateReferenceImageUrl accepts configured HTTPS image host",
  () => {
    assertEquals(
      validateReferenceImageUrl("https://cdn.example.com/logo.png", [
        "cdn.example.com",
      ]),
      "https://cdn.example.com/logo.png",
    );
  },
);

Deno.test("validateReferenceImageUrl rejects non-HTTPS URLs", () => {
  assertEquals(
    validateReferenceImageUrl("http://ik.imagekit.io/app/logo.png"),
    null,
  );
});

Deno.test("validateReferenceImageUrl rejects internal metadata URLs", () => {
  assertEquals(
    validateReferenceImageUrl("http://169.254.169.254/latest"),
    null,
  );
});

Deno.test("validateReferenceImageUrl rejects untrusted HTTPS hosts", () => {
  assertEquals(validateReferenceImageUrl("https://example.com/logo.png"), null);
});
