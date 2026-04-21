import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  encodeTileToPng,
  renderCheckTile,
  renderSolidTile,
  renderStripeTile,
} from "@/functions/_shared/tile-pipeline/canvas-renderer.ts";

Deno.test("renderSolidTile fills every pixel with the requested color", () => {
  const tile = renderSolidTile({ size: 8, color: "#112233" });

  for (let index = 0; index < tile.pixels.length; index += 4) {
    assertEquals(tile.pixels[index], 0x11);
    assertEquals(tile.pixels[index + 1], 0x22);
    assertEquals(tile.pixels[index + 2], 0x33);
    assertEquals(tile.pixels[index + 3], 0xff);
  }

  assertEquals(tile.width, 8);
  assertEquals(tile.height, 8);
});

Deno.test("encodeTileToPng produces a valid PNG signature", async () => {
  const tile = renderSolidTile({ size: 4, color: "#000000" });
  const png = await encodeTileToPng(tile);

  assertEquals(png[0], 0x89);
  assertEquals(png[1], 0x50);
  assertEquals(png[2], 0x4e);
  assertEquals(png[3], 0x47);
  assertEquals(png[4], 0x0d);
  assertEquals(png[5], 0x0a);
  assertEquals(png[6], 0x1a);
  assertEquals(png[7], 0x0a);
});

Deno.test(
  "renderStripeTile alternates colors every stripeWidth columns",
  () => {
    const tile = renderStripeTile({
      size: 16,
      stripeWidthPx: 4,
      colors: ["#ff0000", "#00ff00"],
    });

    assertEquals([tile.pixels[0], tile.pixels[1], tile.pixels[2]], [255, 0, 0]);
    assertEquals(
      [tile.pixels[4 * 4], tile.pixels[4 * 4 + 1], tile.pixels[4 * 4 + 2]],
      [0, 255, 0],
    );
    assertEquals(
      [tile.pixels[8 * 4], tile.pixels[8 * 4 + 1], tile.pixels[8 * 4 + 2]],
      [255, 0, 0],
    );
  },
);

Deno.test("renderCheckTile alternates cells by (cellX + cellY) parity", () => {
  const tile = renderCheckTile({
    size: 8,
    cellSize: 4,
    colors: ["#000000", "#ffffff"],
  });

  assertEquals(tile.pixels[0], 0);
  assertEquals(tile.pixels[4 * 4], 255);
  assertEquals(tile.pixels[4 * (4 * 8)], 255);
});
