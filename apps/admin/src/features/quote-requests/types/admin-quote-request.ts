// ── Options JSON blob ─────────────────────────────────────────

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

// ── List UI model ─────────────────────────────────────────────

export interface AdminQuoteRequestListItem {
  id: string;
  quoteNumber: string;
  date: string;
  status: string;
  quantity: number;
  quotedAmount: number | null;
  customerName: string;
  contactName: string;
  contactMethod: "email" | "kakao" | "phone";
}

// ── Detail UI model ───────────────────────────────────────────

export interface AdminQuoteRequestDetail {
  id: string;
  userId: string;
  quoteNumber: string;
  date: string;
  status: string;
  quantity: number;
  options: QuoteRequestOptions;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
  adminMemo: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
}

// ── Status log UI model ───────────────────────────────────────

export interface AdminQuoteRequestStatusLog {
  id: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  createdAt: string;
}

// ── Form state ────────────────────────────────────────────────

export interface QuoteRequestFormValues {
  quotedAmount: number | null;
  quoteConditions: string;
  adminMemo: string;
  statusMemo: string;
}
