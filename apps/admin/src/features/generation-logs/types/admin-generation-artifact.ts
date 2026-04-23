export type AdminGenerationArtifactPhase = "analysis" | "prep" | "render";

export type AdminGenerationArtifactStatus = "success" | "partial" | "failed";

export interface AdminGenerationArtifactItem {
  id: string;
  workflowId: string;
  phase?: AdminGenerationArtifactPhase;
  artifactType: string;
  sourceWorkId: string | null;
  parentArtifactId: string | null;
  storageProvider: string;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: AdminGenerationArtifactStatus;
  meta: Record<string, unknown>;
  createdAt: string;
}
