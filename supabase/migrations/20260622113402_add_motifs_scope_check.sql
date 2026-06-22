ALTER TABLE public.motifs
  ADD CONSTRAINT motifs_scope_check CHECK (scope IN ('whole', 'partial'));
