export interface ProfileRecord {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  birth: string | null; // DATE 타입은 문자열로 반환됨
  role: "customer" | "admin" | "manager";
  is_active: boolean;
}
