import { describe, expect, it } from "vitest";
import { toAdminMotifItem } from "@/features/motifs/api/admin-motifs-mapper";

describe("toAdminMotifItem", () => {
  it("RPC row를 UI 모델로 변환한다", () => {
    expect(
      toAdminMotifItem({
        id: "motif-1",
        symbol: '<symbol id="motif-1" />',
        color_slots: ["s0", "s1"],
        bbox: [0, 0, 1, 1],
        anchor: [0.5, 0.5],
        subject: "flower",
        scope: "whole",
        view: "front",
        expression: null,
        style: "flat",
        description: "sample motif",
        tags: ["test"],
        source: "recraft",
        quality: 0.8,
        variant_group: "flower:whole",
        created_at: "2026-06-23T00:00:00Z",
      }),
    ).toEqual(
      expect.objectContaining({
        id: "motif-1",
        colorSlots: ["s0", "s1"],
        bbox: [0, 0, 1, 1],
        anchor: [0.5, 0.5],
        source: "recraft",
      }),
    );
  });

  it("깨진 bbox/anchor는 preview 가능한 기본값으로 폴백한다", () => {
    expect(toAdminMotifItem({}).bbox).toEqual([0, 0, 1, 1]);
    expect(toAdminMotifItem({}).anchor).toEqual([0.5, 0.5]);
  });
});
