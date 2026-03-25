import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        exposure?: string;
        loading?: string;
        reveal?: string;
        "shadow-intensity"?: string;
        "shadow-softness"?: string;
        "camera-controls"?: string;
        "auto-rotate"?: string;
        "auto-rotate-delay"?: string;
        "rotation-per-second"?: string;
        "interaction-prompt"?: string;
        "camera-orbit"?: string;
        "min-camera-orbit"?: string;
        "max-camera-orbit"?: string;
        "environment-image"?: string;
        "touch-action"?: string;
        ar?: string;
      };
    }
  }
}

export {};
