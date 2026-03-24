-- shipping_addresses.user_id 인덱스 추가
-- RLS 정책 USING (auth.uid() = user_id) 평가 성능 개선
CREATE INDEX idx_shipping_addresses_user_id
  ON public.shipping_addresses USING btree (user_id);
