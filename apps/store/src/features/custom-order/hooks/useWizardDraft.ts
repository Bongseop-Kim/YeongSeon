import { useCallback, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import { toast } from "@/lib/toast";

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
    !Array.isArray(d.visitedSteps) ||
    !d.visitedSteps.every((s) => typeof s === "number") ||
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
        formValues: {
          ...draft.formValues,
          referenceImages: null,
          contactName: "",
          contactValue: "",
        },
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

interface WizardStepState {
  currentStepIndex: number;
  visitedSteps: Set<number>;
}

export const useRestoreDraft = (
  form: UseFormReturn<QuoteOrderOptions>,
  resetTo: (stepIndex: number, visited: Set<number>) => void,
) => {
  const { loadDraft, clearDraft } = useWizardDraft();
  const draftCheckedRef = useRef(false);
  const toastIdRef = useRef<string | number | undefined>();

  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    const existing = loadDraft();
    if (!existing) return;

    let restored = false;

    const removeClickListener = () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };

    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-sonner-toast]")) return;
      removeClickListener();
      if (toastIdRef.current !== undefined) toast.dismiss(toastIdRef.current);
    };

    toastIdRef.current = toast.info("이전에 작성 중이던 주문이 있어요", {
      action: {
        label: "이어서 하기",
        onClick: () => {
          restored = true;
          removeClickListener();
          form.reset(existing.formValues);
          resetTo(existing.currentStepIndex, new Set(existing.visitedSteps));
        },
      },
      onDismiss: () => {
        removeClickListener();
        if (!restored) clearDraft();
      },
      onAutoClose: () => {
        removeClickListener();
        if (!restored) clearDraft();
      },
      duration: 8000,
    });

    // 토스트 렌더 후 바깥 클릭 리스너 등록
    // cleanup을 반환하지 않음 — StrictMode에서 cleanup이 리스너를 제거하는 문제 방지
    // 리스너는 바깥 클릭 / onDismiss / onAutoClose / 이어서 하기 시 자체 정리됨
    setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside, true);
    }, 100);
  }, [loadDraft, clearDraft, form, resetTo]);
};

export const useAutoSave = (
  form: UseFormReturn<QuoteOrderOptions>,
  wizard: WizardStepState,
) => {
  const { saveDraft } = useWizardDraft();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 자동 저장: form values 변경 시 1초 debounce
  useEffect(() => {
    const subscription = form.watch(() => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveDraft({
          formValues: form.getValues(),
          currentStepIndex: wizard.currentStepIndex,
          visitedSteps: [...wizard.visitedSteps],
          savedAt: Date.now(),
        });
      }, 1000);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, wizard.currentStepIndex, wizard.visitedSteps, saveDraft]);

  // 자동 저장: 스텝 이동 시 즉시 저장
  useEffect(() => {
    saveDraft({
      formValues: form.getValues(),
      currentStepIndex: wizard.currentStepIndex,
      visitedSteps: [...wizard.visitedSteps],
      savedAt: Date.now(),
    });
  }, [wizard.currentStepIndex, saveDraft, form, wizard.visitedSteps]);
};
