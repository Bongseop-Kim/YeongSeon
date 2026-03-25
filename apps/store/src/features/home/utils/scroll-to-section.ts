import type { MouseEvent } from "react";

export const scrollToSection =
  (hash: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hash.startsWith("#")) {
      return;
    }

    const target = document.querySelector<HTMLElement>(hash);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", hash);
  };
