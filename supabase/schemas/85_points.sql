-- =============================================================
-- 85_points.sql  –  Points (purchase confirmation rewards)
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
CREATE UNIQUE INDEX idx_points_order_earn ON public.points (order_id, type) WHERE order_id IS NOT NULL AND type = 'earn';

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
-- Returns the current non-expired point balance for a user.
CREATE OR REPLACE FUNCTION public.get_user_point_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.points
  WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now());
$$;
