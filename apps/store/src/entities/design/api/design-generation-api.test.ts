import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteDesignGeneration,
  getDesignGenerations,
} from "@/entities/design/api/design-generation-api";
import { supabase } from "@/shared/lib/supabase";

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("design-generation-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDesignGenerations selects latest non-deleted generations with variants", async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ range });
    const is = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ is });
    vi.mocked(supabase.from).mockReturnValue({ select } as never);

    await getDesignGenerations({ limit: 20, offset: 0 });

    expect(supabase.from).toHaveBeenCalledWith("design_generations");
    expect(select).toHaveBeenCalledWith(
      "id, user_id, prompt, pattern_type, fabric_type, request_metadata, created_at, updated_at, design_generation_variants(id, generation_id, variant_index, repeat_tile_url, repeat_tile_work_id, accent_tile_url, accent_tile_work_id, accent_layout_json, pattern_type, fabric_type, created_at)",
    );
    expect(is).toHaveBeenCalledWith("deleted_at", null);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(range).toHaveBeenCalledWith(0, 19);
  });

  it("deleteDesignGeneration soft deletes through RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 204,
      statusText: "No Content",
    });

    await deleteDesignGeneration("gen-1");

    expect(supabase.rpc).toHaveBeenCalledWith("delete_design_generation", {
      p_generation_id: "gen-1",
    });
  });
});
