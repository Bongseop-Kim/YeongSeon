-- =============================================================
-- Migration: Setup pg_cron schedules for delivery/confirmation automation
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Grant cron usage to postgres role (required by pg_cron)
GRANT USAGE ON SCHEMA cron TO postgres;

-- 1. Delivery status check: every 2 hours via Edge Function
--    Calls check-delivery-status Edge Function to detect delivered packages.
SELECT cron.schedule(
  'check-delivery-status',
  '0 */2 * * *',
  $$
  SELECT extensions.http_post(
    url      := current_setting('app.supabase_url') || '/functions/v1/check-delivery-status',
    headers  := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body     := '{}'::jsonb
  );
  $$
);

-- 2. Auto-confirm orders: daily at 03:00 KST (= 18:00 UTC previous day)
--    Calls auto_confirm_delivered_orders() directly (no HTTP overhead).
SELECT cron.schedule(
  'auto-confirm-delivered-orders',
  '0 18 * * *',
  $$ SELECT public.auto_confirm_delivered_orders(); $$
);
