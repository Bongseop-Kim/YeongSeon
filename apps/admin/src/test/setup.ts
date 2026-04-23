import "@testing-library/jest-dom/vitest";

// antd components rely on matchMedia, which jsdom does not implement.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const originalGetComputedStyle = window.getComputedStyle.bind(window);
const normalizePseudoElement = (pseudoElt?: string | null) =>
  pseudoElt && pseudoElt !== "" ? undefined : pseudoElt;

// Ant Design internals may probe pseudo-element styles, which jsdom logs as a
// not-implemented warning even though the rendered behavior under test does not
// depend on pseudo-element output.
window.getComputedStyle = ((element: Element, pseudoElt?: string | null) =>
  originalGetComputedStyle(
    element,
    normalizePseudoElement(pseudoElt),
  )) as typeof window.getComputedStyle;
