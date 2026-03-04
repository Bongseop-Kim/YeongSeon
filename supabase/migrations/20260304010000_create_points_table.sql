-- =============================================================
-- Migration: Create points table for purchase confirmation rewards
-- =============================================================

CREATE TABLE public.points (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  amount      integer     NOT NULL CHECK (amount != 0),
  type        text        NOT NULL CHECK (type = ANY(ARRAY['earn','use','expire','admin'])),
  description text,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_user_id  ON public.points (user_id, created_at DESC);
CREATE INDEX idx_points_order_id ON public.points (order_id) WHERE order_id IS NOT NULL;

-- RLS: users can only SELECT their own points
-- INSERT/UPDATE are controlled exclusively by SECURITY DEFINER RPCs
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON public.points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
  ON public.points FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── get_user_point_balance ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_point_balance(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.points
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
$$;
