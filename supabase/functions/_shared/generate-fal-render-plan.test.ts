import { assertEquals } from "jsr:@std/assert@1.0.19";
import { planFalRender } from "@/functions/_shared/generate-fal-render-plan.ts";

Deno.test(
  "planFalRender skips reference upscaling when ci image is present",
  () => {
    const plan = planFalRender(
      {
        referenceImageBase64: "reference",
        ciImageBase64: "ci",
      },
      null,
    );

    assertEquals(plan.shouldUpscaleReference, false);
    assertEquals(plan.isA2Scenario, false);
    assertEquals(plan.renderBackend, "img2img");
  },
);

Deno.test(
  "planFalRender selects ip adapter when processed reference exists",
  () => {
    const plan = planFalRender(
      {
        referenceImageBase64: "reference",
        ciImageBase64: undefined,
      },
      {
        base64: "processed",
        mimeType: "image/png",
      },
    );

    assertEquals(plan.shouldUpscaleReference, true);
    assertEquals(plan.isA2Scenario, true);
    assertEquals(plan.renderBackend, "ip_adapter");
  },
);
