import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";

interface ShouldUseFalPipelineInput {
  ciImageBase64: string | undefined;
  ciPlacement: CiPlacement | null | undefined;
  fabricMethod: FabricMethod | null | undefined;
  autoGenerate: boolean;
}

export function shouldUseFalPipeline(
  input: ShouldUseFalPipelineInput,
): boolean {
  return (
    input.autoGenerate &&
    input.ciPlacement === "all-over" &&
    !!input.ciImageBase64 &&
    !!input.fabricMethod
  );
}
