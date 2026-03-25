export interface ServiceCard {
  id: number;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export interface ManufacturingStep {
  step: number;
  label: string;
  description: string;
}
