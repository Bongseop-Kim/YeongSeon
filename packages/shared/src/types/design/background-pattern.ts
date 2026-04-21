export type BackgroundPattern =
  | { type: "solid"; color: string }
  | { type: "stripe"; width: number; colors: [string, string] }
  | { type: "check"; cellSize: number; colors: [string, string] }
  | {
      type: "dot";
      dotSize: number;
      spacing: number;
      color: string;
      background: string;
    };
