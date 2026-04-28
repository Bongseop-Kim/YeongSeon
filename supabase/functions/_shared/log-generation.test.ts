import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import { logGeneration } from "@/functions/_shared/log-generation.ts";

const baseLog = {
  work_id: "work-1",
  workflow_id: "workflow-1",
  phase: "render",
  parent_work_id: null,
  user_id: "user-1",
  ai_model: "openai",
  request_type: "render_standard",
  quality: "standard",
  user_message: "요청",
  prompt_length: 0,
  route: "tile_generation",
  image_generated: true,
} as const;

Deno.test(
  "logGeneration rejects when requireSuccess is enabled and upsert fails",
  async () => {
    const supabaseError = { message: "violates foreign key constraint" };
    const client = {
      from: () => ({
        upsert: () =>
          Promise.resolve({
            error: supabaseError,
          }),
      }),
    };

    const error = await assertRejects(
      () => logGeneration(client as never, baseLog, { requireSuccess: true }),
      Error,
      "logGeneration upsert error: violates foreign key constraint",
    );
    assertEquals(error.cause, supabaseError);
  },
);
