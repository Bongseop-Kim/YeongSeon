import { assertEquals } from "jsr:@std/assert@1.0.19";
import { renderSolidTile } from "@/functions/_shared/tile-pipeline/canvas-renderer.ts";
import { composeTiled } from "@/functions/_shared/tile-pipeline/compose.ts";

Deno.test("composeTiled repeats tile across canvas", () => {
  const tile = renderSolidTile({ size: 4, color: "#aabbcc" });
  const output = composeTiled({
    tile,
    canvasWidth: 8,
    canvasHeight: 8,
    tileSize: 4,
    gap: 0,
  });

  assertEquals(output.width, 8);
  assertEquals(output.height, 8);

  for (let index = 0; index < output.pixels.length; index += 4) {
    assertEquals(output.pixels[index], 0xaa);
    assertEquals(output.pixels[index + 1], 0xbb);
    assertEquals(output.pixels[index + 2], 0xcc);
  }
});

Deno.test("composeTiled leaves gap pixels as gapColor", () => {
  const tile = renderSolidTile({ size: 4, color: "#ff0000" });
  const output = composeTiled({
    tile,
    canvasWidth: 10,
    canvasHeight: 4,
    tileSize: 4,
    gap: 2,
    gapColor: "#00ff00",
  });

  assertEquals(output.pixels[0], 255);
  assertEquals(output.pixels[4 * 4 + 1], 255);
  assertEquals(output.pixels[6 * 4], 255);
});
