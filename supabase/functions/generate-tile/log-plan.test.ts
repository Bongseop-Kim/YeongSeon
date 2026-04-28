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
      repeatResult: {
        url: "https://imagekit.example/repeat.webp",
        workId: "repeat-work",
      },
      accentResult: {
        url: "https://imagekit.example/accent.webp",
        workId: "accent-work",
      },
      primaryWorkId: "repeat-work",
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
      ["repeat-work", "accent-work"],
    );
    assertEquals(logs[0]?.tokens_charged, 3);
    assertEquals(logs[1]?.tokens_charged, 0);
    assertEquals(logs[0]?.paired_tile_work_id, "accent-work");
    assertEquals(logs[1]?.paired_tile_work_id, "repeat-work");
  },
);

Deno.test(
  "buildSuccessfulTileGenerationLogs does not create a duplicate row when accent generation reuses the charged work id",
  () => {
    const logs = buildSuccessfulTileGenerationLogs({
      baseLog,
      repeatResult: {
        url: "https://imagekit.example/repeat.webp",
        workId: "previous-repeat-work",
      },
      accentResult: {
        url: "https://imagekit.example/accent.webp",
        workId: "render-work",
      },
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
      ["render-work"],
    );
    assertEquals(logs[0]?.repeat_tile_work_id, "previous-repeat-work");
    assertEquals(logs[0]?.paired_tile_work_id, "previous-repeat-work");
  },
);
