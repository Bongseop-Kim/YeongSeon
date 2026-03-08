import { useEffect, useState } from "react";

const ONBOARDING_STORAGE_KEY = "ai-design-onboarding-completed";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        setShowOnboarding(true);
      }
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // localStorage 접근 실패 시 무시
    }
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}
