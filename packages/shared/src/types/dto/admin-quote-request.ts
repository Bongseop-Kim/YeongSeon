/** admin_quote_request_list_view row */
export interface AdminQuoteRequestListRowDTO {
  id: string;
  userId: string;
  quoteNumber: string;
  date: string;
  status: string;
  quantity: number;
  quotedAmount: number | null;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
  createdAt: string;
  updatedAt: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
}

/** admin_quote_request_detail_view row */
export interface AdminQuoteRequestDetailRowDTO {
  id: string;
  userId: string;
  quoteNumber: string;
  date: string;
  status: string;
  options: Record<string, unknown>;
  quantity: number;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
  adminMemo: string | null;
  createdAt: string;
  updatedAt: string | null;
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

/** admin_quote_request_status_log_view row */
export interface QuoteRequestStatusLogDTO {
  id: string;
  quoteRequestId: string;
  changedBy: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  createdAt: string;
}
