import { useCallback } from "react";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { OrderPurpose } from "@/features/custom-order/types/wizard";

const DRAFT_KEY = "custom-order-draft";

export interface WizardDraft {
  formValues: QuoteOrderOptions;
  currentStepIndex: number;
  visitedSteps: number[];
  savedAt: number;
  purpose: OrderPurpose | null;
}

const isWizardDraft = (obj: unknown): obj is WizardDraft => {
  if (!obj || typeof obj !== "object") return false;
  const d = obj as Record<string, unknown>;
  return (
    typeof d.formValues === "object" &&
    d.formValues !== null &&
    typeof d.currentStepIndex === "number" &&
    Array.isArray(d.visitedSteps) && d.visitedSteps.every((s) => typeof s === "number") &&
    typeof d.savedAt === "number" &&
    (d.purpose === null || d.purpose === "order" || d.purpose === "sample")
  );
};

export const useWizardDraft = () => {
  const loadDraft = useCallback((): WizardDraft | null => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isWizardDraft(parsed)) return null;
      if (!parsed.purpose) {
        parsed.purpose = "order";
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const saveDraft = useCallback((draft: WizardDraft): void => {
    try {
      const sanitized: WizardDraft = {
        ...draft,
        formValues: { ...draft.formValues, referenceImages: null },
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(sanitized));
    } catch {
      // sessionStorage quota exceeded — silently ignore
    }
  }, []);

  const clearDraft = useCallback((): void => {
    sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  return { loadDraft, saveDraft, clearDraft };
};
