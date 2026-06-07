DO $$
DECLARE
  v_signature text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.auto_generate_product_code()',
    'public.generate_claim_number()',
    'public.generate_order_number()',
    'public.generate_quote_number()',
    'public.generate_token_order_number()',
    'public.grant_initial_design_tokens()',
    'public.set_image_expiry_on_quote_complete()'
  ]
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        v_signature
      );
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.admin_get_email(uuid)',
    'public.admin_update_claim_status(uuid, text, text, boolean)',
    'public.admin_update_order_tracking(uuid, text, text, text, text)',
    'public.admin_update_quote_request_status(uuid, text, integer, text, text, text)',
    'public.cancel_claim(uuid)',
    'public.cancel_token_refund(uuid)',
    'public.create_custom_order_txn(uuid, jsonb, integer, jsonb, text, boolean, text, uuid)',
    'public.create_order_txn(uuid, jsonb, jsonb)',
    'public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text)',
    'public.create_sample_order_txn(uuid, text, jsonb, jsonb, text, uuid)',
    'public.create_token_order(text)',
    'public.customer_confirm_purchase(uuid)',
    'public.delete_design_generation(uuid)',
    'public.get_design_token_balances_admin(uuid[])',
    'public.manage_design_tokens_admin(uuid, integer, text)',
    'public.remove_cart_items_by_ids(uuid, text[])',
    'public.replace_cart_items(uuid, jsonb)',
    'public.request_token_refund(uuid, text)',
    'public.save_design_session(uuid, text, text, jsonb, text, text, text, text, jsonb, text, text)',
    'public.submit_repair_no_tracking(uuid, text, text, jsonb)',
    'public.submit_repair_tracking(uuid, text, text, jsonb)'
  ]
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        v_signature
      );
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_signature);
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.admin_update_order_status(uuid, text, text, boolean)',
    'public.admin_update_order_status(uuid, text, text, text, boolean)',
    'public.create_phone_verification(text, timestamp with time zone, text)',
    'public.is_admin()',
    'public.set_notification_preferences(boolean, boolean)'
  ]
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        v_signature
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',
        v_signature
      );
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.approve_token_refund(uuid, uuid)',
    'public.auto_confirm_delivered_orders()',
    'public.confirm_payment_orders(uuid, uuid, text)',
    'public.delete_old_claim_notification_logs(interval)',
    'public.lock_payment_orders(uuid, uuid)',
    'public.refund_design_tokens(uuid, integer, text, text, text)',
    'public.unlock_payment_orders(uuid, uuid)',
    'public.use_design_tokens(uuid, text, text, text, text)'
  ]
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
        v_signature
      );
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
    END IF;
  END LOOP;
END;
$$;
