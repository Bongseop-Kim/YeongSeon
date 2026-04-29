import { assertEquals } from "jsr:@std/assert@1.0.19";
import { buildSuccessfulTileGenerationLogs } from "./log-plan.ts";
import type { AiGenerationLogInsert } from "@/functions/_shared/log-generation.ts";

const baseLog = {
  work_id: "render-work",
  workflow_id: "workflow-1",
  phase: "render",
  parent_work_id: null,
  user_id: "user-1",
  ai_model: "openai",
  request_type: "render_standard",
  quality: "standard",
  user_message: "원포인트 넥타이",
  prompt_length: 100,
  request_attachments: null,
  route: "tile_generation",
  image_prompt: "prompt",
  normalized_design: { patternType: "one_point" },
  has_reference_image: false,
  has_previous_image: false,
} satisfies Omit<
  AiGenerationLogInsert,
  | "image_generated"
  | "generated_image_url"
  | "tokens_charged"
  | "tokens_refunded"
>;

Deno.test(
  "buildSuccessfulTileGenerationLogs creates a log row for every generated tile work id",
  () => {
    const logs = buildSuccessfulTileGenerationLogs({
      baseLog,
      repeatResults: [1, 2, 3, 4].map((index) => ({
        url: `https://imagekit.example/repeat-${index}.webp`,
        workId: `repeat-work-${index}`,
      })),
      accentResults: [1, 2, 3, 4].map((index) => ({
        url: `https://imagekit.example/accent-${index}.webp`,
        workId: `accent-work-${index}`,
      })),
      primaryWorkId: "repeat-work-1",
      tokensCharged: 3,
      tokensRefunded: 0,
      patternType: "one_point",
      fabricType: "printed",
      accentLayout: {
        objectDescription: "로고",
        objectSource: "text",
        color: null,
        size: "medium",
      },
      reusedRepeatTile: false,
    });

    assertEquals(
      logs.map((log) => log.work_id),
      [
        "repeat-work-1",
        "accent-work-1",
        "repeat-work-2",
        "accent-work-2",
        "repeat-work-3",
        "accent-work-3",
        "repeat-work-4",
        "accent-work-4",
      ],
    );
    assertEquals(logs[0]?.tokens_charged, 3);
    assertEquals(logs[1]?.tokens_charged, 0);
    assertEquals(logs[0]?.paired_tile_work_id, "accent-work-1");
    assertEquals(logs[1]?.paired_tile_work_id, "repeat-work-1");
  },
);

Deno.test(
  "buildSuccessfulTileGenerationLogs charges only the primary generated work id",
  () => {
    const logs = buildSuccessfulTileGenerationLogs({
      baseLog,
      repeatResults: [1, 2, 3, 4].map((index) => ({
        url: `https://imagekit.example/repeat-${index}.webp`,
        workId: index === 1 ? "render-work" : `repeat-work-${index}`,
      })),
      accentResults: [],
      primaryWorkId: "render-work",
      tokensCharged: 3,
      tokensRefunded: 0,
      patternType: "all_over",
      fabricType: "printed",
      accentLayout: null,
      reusedRepeatTile: false,
    });

    assertEquals(
      logs.map((log) => log.tokens_charged),
      [3, 0, 0, 0],
    );
  },
);

Deno.test(
  "buildSuccessfulTileGenerationLogs does not create a duplicate row when accent generation reuses the charged work id",
  () => {
    const logs = buildSuccessfulTileGenerationLogs({
      baseLog,
      repeatResults: [1, 2, 3, 4].map(() => ({
        url: "https://imagekit.example/repeat.webp",
        workId: "previous-repeat-work",
      })),
      accentResults: [1, 2, 3, 4].map((index) => ({
        url: `https://imagekit.example/accent-${index}.webp`,
        workId: index === 1 ? "render-work" : `accent-work-${index}`,
      })),
      primaryWorkId: "render-work",
      tokensCharged: 3,
      tokensRefunded: 0,
      patternType: "one_point",
      fabricType: "printed",
      accentLayout: null,
      reusedRepeatTile: true,
    });

    assertEquals(
      logs.map((log) => log.work_id),
      ["render-work", "accent-work-2", "accent-work-3", "accent-work-4"],
    );
    assertEquals(logs[0]?.repeat_tile_work_id, "previous-repeat-work");
    assertEquals(logs[0]?.paired_tile_work_id, "previous-repeat-work");
    assertEquals(
      logs.map((log) => log.tokens_charged),
      [3, 0, 0, 0],
    );
  },
);
