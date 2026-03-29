-- Drop the old 4-parameter overload of admin_update_order_status.
-- The 5-parameter version (with p_payment_key) was added in 20260408000001,
-- but CREATE OR REPLACE only replaced the exact same signature, leaving
-- the old (uuid, text, text, boolean) overload in place.
-- With both overloads present, calling the function with 2 args is ambiguous.
DROP FUNCTION IF EXISTS public.admin_update_order_status(uuid, text, text, boolean);
