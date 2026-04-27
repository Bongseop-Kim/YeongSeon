import { assertEquals } from "jsr:@std/assert";
import { chargeTileRenderTokens, refundTileRenderTokens } from "./billing.ts";

Deno.test(
  "chargeTileRenderTokens charges an OpenAI render_standard token against the tile work id",
  async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const client = {
      rpc: (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        return Promise.resolve({
          data: { success: true, balance: 7, cost: 5 },
          error: null,
        });
      },
    };

    const { data, error } = await chargeTileRenderTokens(client, {
      userId: "user-1",
      workId: "tile-work-1",
    });

    assertEquals(error, null);
    assertEquals(data, { success: true, balance: 7, cost: 5 });
    assertEquals(calls, [
      {
        fn: "use_design_tokens",
        args: {
          p_user_id: "user-1",
          p_ai_model: "openai",
          p_request_type: "render_standard",
          p_work_id: "tile-work-1",
        },
      },
    ]);
  },
);

Deno.test(
  "refundTileRenderTokens distinguishes skipped, failed and succeeded",
  async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const successClient = {
      rpc: (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        return Promise.resolve({ data: null, error: null });
      },
    };
    const failedClient = {
      rpc: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    };

    assertEquals(
      await refundTileRenderTokens(successClient, {
        userId: "user-1",
        amount: 0,
        workId: "refund-0",
      }),
      "skipped",
    );
    assertEquals(calls.length, 0);
    assertEquals(
      await refundTileRenderTokens(failedClient, {
        userId: "user-1",
        amount: 5,
        workId: "refund-failed",
      }),
      "failed",
    );
    assertEquals(
      await refundTileRenderTokens(successClient, {
        userId: "user-1",
        amount: 5,
        workId: "refund-ok",
      }),
      "succeeded",
    );
  },
);
