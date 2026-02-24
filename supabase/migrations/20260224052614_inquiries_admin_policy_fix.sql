-- Add SELECT policy for admins/managers to view all inquiries
CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin'::public.user_role, 'manager'::public.user_role)
    )
  );

-- Grant admin-updated columns so RLS policies can apply
GRANT UPDATE (status, answer, answer_date) ON TABLE public.inquiries TO authenticated;
