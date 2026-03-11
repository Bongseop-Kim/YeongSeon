import type {
  ContactMethod,
  QuoteRequestStatus,
} from "../../constants/quote-request-status";

export interface QuoteRequestListItem {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  quotedAmount: number | null;
  contactName: string;
  contactMethod: ContactMethod;
}

export interface QuoteRequestOptions {
  tieType: string;
  interlining: string;
  designType: string;
  fabricType: string;
  fabricProvided: boolean;
  interliningThickness: string;
  triangleStitch: boolean;
  sideStitch: boolean;
  barTack: boolean;
  dimple: boolean;
  spoderato: boolean;
  fold7: boolean;
  brandLabel: boolean;
  careLabel: boolean;
}

export interface QuoteRequestDetail {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  options: QuoteRequestOptions;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: ContactMethod;
  contactValue: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
}
