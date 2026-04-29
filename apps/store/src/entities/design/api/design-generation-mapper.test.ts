import { describe, expect, it } from "vitest";
import {
  toDesignGeneration,
  type DesignGenerationRow,
} from "@/entities/design/api/design-generation-mapper";

const baseRow = {
  id: "gen-1",
  user_id: "user-1",
  prompt: "네이비 스트라이프 원포인트",
  pattern_type: "one_point",
  fabric_type: "yarn_dyed",
  request_metadata: {
    selectedColors: ["#1a2c5b"],
    attachments: [],
    route: "tile_generation",
  },
  created_at: "2026-04-29T10:00:00.000Z",
  updated_at: "2026-04-29T10:00:00.000Z",
  design_generation_variants: [
    {
      id: "var-1",
      generation_id: "gen-1",
      variant_index: 1,
      repeat_tile_url: "https://ik.imagekit.io/essesion/tiles/repeat-1.webp",
      repeat_tile_work_id: "repeat-work-1",
      accent_tile_url: "https://ik.imagekit.io/essesion/tiles/accent-1.webp",
      accent_tile_work_id: "accent-work-1",
      accent_layout_json: {
        objectDescription: "gold crest",
        objectSource: "text",
        color: "gold",
        size: "medium",
      },
      pattern_type: "one_point",
      fabric_type: "yarn_dyed",
      created_at: "2026-04-29T10:00:01.000Z",
    },
  ],
} satisfies DesignGenerationRow;

describe("toDesignGeneration", () => {
  it("maps one-point variants with repeat/accent pairing", () => {
    const generation = toDesignGeneration(baseRow);

    expect(generation.id).toBe("gen-1");
    expect(generation.patternType).toBe("one_point");
    expect(generation.variants).toHaveLength(1);
    expect(generation.variants[0]).toMatchObject({
      id: "var-1",
      index: 1,
      repeatTile: {
        url: "https://ik.imagekit.io/essesion/tiles/repeat-1.webp",
        workId: "repeat-work-1",
      },
      accentTile: {
        url: "https://ik.imagekit.io/essesion/tiles/accent-1.webp",
        workId: "accent-work-1",
      },
      patternType: "one_point",
      fabricType: "yarn_dyed",
    });
  });

  it("maps all-over variants with null accent", () => {
    const row: DesignGenerationRow = {
      ...baseRow,
      pattern_type: "all_over",
      design_generation_variants: [
        {
          ...baseRow.design_generation_variants[0],
          pattern_type: "all_over",
          accent_tile_url: null,
          accent_tile_work_id: null,
          accent_layout_json: null,
        },
      ],
    };

    const generation = toDesignGeneration(row);

    expect(generation.patternType).toBe("all_over");
    expect(generation.variants[0].accentTile).toBeNull();
    expect(generation.variants[0].accentLayout).toBeNull();
  });

  it("rejects invalid one-point variants without an accent pair", () => {
    const row: DesignGenerationRow = {
      ...baseRow,
      design_generation_variants: [
        {
          ...baseRow.design_generation_variants[0],
          accent_tile_url: null,
          accent_tile_work_id: null,
        },
      ],
    };

    expect(() => toDesignGeneration(row)).toThrow(
      "one_point variant requires accent tile",
    );
  });
});
