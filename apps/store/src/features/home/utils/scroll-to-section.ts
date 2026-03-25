import type { MouseEvent } from "react";

export const scrollToSection =
  (hash: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hash.startsWith("#")) {
      return;
    }

    const targetId = hash.slice(1);
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", hash);
  };
