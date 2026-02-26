import { useCallback } from "react";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

const DRAFT_KEY = "custom-order-draft";

export interface WizardDraft {
  formValues: QuoteOrderOptions;
  currentStepIndex: number;
  visitedSteps: number[];
  savedAt: number;
}

const isWizardDraft = (obj: unknown): obj is WizardDraft => {
  if (!obj || typeof obj !== "object") return false;
  const d = obj as Record<string, unknown>;
  if (
    typeof d.formValues !== "object" ||
    d.formValues === null ||
    typeof d.currentStepIndex !== "number" ||
    !Array.isArray(d.visitedSteps) || !d.visitedSteps.every((s) => typeof s === "number") ||
    typeof d.savedAt !== "number"
  ) {
    return false;
  }
  const f = d.formValues as Record<string, unknown>;
  return typeof f.quantity === "number";
};

export const useWizardDraft = () => {
  const loadDraft = useCallback((): WizardDraft | null => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isWizardDraft(parsed)) return null;
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
