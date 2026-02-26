import type { OrderOptions, QuoteOrderOptions } from "./order";

export type WizardStepId =
  | "quantity"
  | "fabric"
  | "sewing"
  | "spec"
  | "finishing"
  | "sample"
  | "attachment"
  | "confirm";

export interface StepConfig {
  id: WizardStepId;
  label: string;
  validate: (values: QuoteOrderOptions) => string | null;
  isSkippable: (values: OrderOptions) => boolean;
}

export type SewingStyle = "normal" | "dimple" | "spoderato" | "fold7";

export type PackagePreset = "basic" | "recommended" | "premium";
