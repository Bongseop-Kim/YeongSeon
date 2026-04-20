import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  loadAnalysisSnapshot,
  type AnalysisSnapshotRow,
} from "@/functions/_shared/design-generation.ts";

Deno.test(
  "loadAnalysisSnapshot allows missing image prompts when textPrompt exists",
  async () => {
    const row: AnalysisSnapshotRow = {
      workflow_id: "workflow-1",
      work_id: "analysis-1",
      user_message: "분석 요청",
      ai_message: "분석 완료",
      generate_image: true,
      eligible_for_render: true,
      missing_requirements: [],
      eligibility_reason: "ready",
      conversation_turn: 1,
      design_context: { colors: ["navy"] },
      normalized_design: { colors: ["navy"], fabricMethod: "yarn-dyed" },
      detected_design: null,
      text_prompt: "text prompt",
      image_prompt: null,
      image_edit_prompt: null,
      has_ci_image: false,
      has_reference_image: false,
      has_previous_image: false,
    };

    const adminClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: row, error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await loadAnalysisSnapshot(
      adminClient as never,
      "user-1",
      "analysis-1",
    );

    assertEquals(result.workflowId, "workflow-1");
    assertEquals(result.analysisWorkId, "analysis-1");
    assertEquals(result.textPrompt, "text prompt");
    assertEquals(result.imagePrompt, null);
    assertEquals(result.imageEditPrompt, null);
  },
);
