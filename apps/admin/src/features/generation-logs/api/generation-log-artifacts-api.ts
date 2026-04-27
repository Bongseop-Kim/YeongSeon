import { supabase } from "@/lib/supabase";
import { toAdminGenerationArtifactItem } from "@/features/generation-logs/api/generation-log-artifacts-mapper";
import type { AdminGenerationArtifactItem } from "@/features/generation-logs/types/admin-generation-artifact";

export async function getGenerationLogArtifacts(
  workflowId: string,
): Promise<AdminGenerationArtifactItem[]> {
  const { data, error } = await supabase.rpc(
    "admin_get_generation_log_artifacts",
    {
      p_workflow_id: workflowId,
    },
  );

  if (error) {
    throw new Error(error.message, { cause: error });
  }

  if (!Array.isArray(data)) {
    throw new Error("Unexpected artifact response shape");
  }

  return data.map(toAdminGenerationArtifactItem);
}
