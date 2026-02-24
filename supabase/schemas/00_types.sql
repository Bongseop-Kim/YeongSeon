-- =============================================================
-- 00_types.sql  –  Custom ENUM types
-- =============================================================

CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'manager');
