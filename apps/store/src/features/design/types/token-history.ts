export interface DesignTokenHistoryItem {
  id: string;
  amount: number;
  type: string;
  aiModel: string | null;
  requestType: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}
