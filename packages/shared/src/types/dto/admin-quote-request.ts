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
  created_at: string;
  updated_at: string | null;
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
  created_at: string;
  updated_at: string | null;
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

/** quote_request_status_logs row */
export interface QuoteRequestStatusLogDTO {
  id: string;
  quote_request_id: string;
  changed_by: string;
  previous_status: string;
  new_status: string;
  memo: string | null;
  created_at: string;
}
