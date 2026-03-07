export interface CreateOrderResultDTO {
  payment_group_id: string;
  total_amount: number;
  orders: Array<{
    order_id: string;
    order_number: string;
    order_type: string;
  }>;
}
