import { useEffect, useState } from "react";

const ONBOARDING_STORAGE_KEY = "ai-design-onboarding-completed";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);

    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}
