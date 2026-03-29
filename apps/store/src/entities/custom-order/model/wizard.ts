import type { OrderOptions, QuoteOrderOptions } from "./order";

export type WizardStepId =
  | "quantity"
  | "fabric"
  | "sewing"
  | "spec"
  | "finishing"
  | "attachment"
  | "confirm";

export interface StepConfig {
  id: WizardStepId;
  label: string;
  validate: (values: QuoteOrderOptions) => string | null;
  isSkippable: (values: OrderOptions) => boolean;
}

export type PackagePreset = "basic" | "recommended" | "premium";
