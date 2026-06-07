-- =============================================================
-- zz_function_privileges.sql - Explicit RPC EXECUTE grants
-- =============================================================

REVOKE ALL ON FUNCTION public.admin_get_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_email(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_claim_status(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_claim_status(uuid, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_order_tracking(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_order_tracking(uuid, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_quote_request_status(uuid, text, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_quote_request_status(uuid, text, integer, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_token_refund(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.auto_confirm_delivered_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_confirm_delivered_orders() TO service_role;

REVOKE ALL ON FUNCTION public.auto_generate_product_code() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.cancel_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_claim(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_token_refund(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_token_refund(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.create_custom_order_txn(uuid, jsonb, integer, jsonb, text, boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_custom_order_txn(uuid, jsonb, integer, jsonb, text, boolean, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_order_txn(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_txn(uuid, jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.create_phone_verification(text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_phone_verification(text, timestamptz, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_sample_order_txn(uuid, text, jsonb, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sample_order_txn(uuid, text, jsonb, jsonb, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_token_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_token_order(text) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_confirm_purchase(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_confirm_purchase(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.delete_design_generation(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.delete_design_generation(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.delete_design_generation(uuid) TO authenticated;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_old_claim_notification_logs(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_old_claim_notification_logs(interval) TO service_role;

REVOKE ALL ON FUNCTION public.generate_claim_number() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.generate_quote_number() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.generate_token_order_number() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_design_token_balances_admin(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_design_token_balances_admin(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.grant_initial_design_tokens() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.lock_payment_orders(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_payment_orders(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.manage_design_tokens_admin(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_design_tokens_admin(uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.refund_design_tokens(uuid, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_design_tokens(uuid, integer, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.remove_cart_items_by_ids(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_cart_items_by_ids(uuid, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.replace_cart_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_cart_items(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.request_token_refund(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_token_refund(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.save_design_session(uuid, text, text, jsonb, text, text, text, text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_design_session(uuid, text, text, jsonb, text, text, text, text, jsonb, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_image_expiry_on_quote_complete() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.set_notification_preferences(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(boolean, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.unlock_payment_orders(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.use_design_tokens(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_design_tokens(uuid, text, text, text, text) TO service_role;
