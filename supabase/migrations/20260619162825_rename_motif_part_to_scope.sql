-- Rename the motif facet column `part` -> `scope` and rework the facet hard-filter index.
--
-- Why: the motif facet model moved from "subject + part are both controlled vocabularies"
-- to "subject = free text (the domain is open: any object/shape/organism/abstract), and
-- `scope` = the one controlled granularity facet (whole|partial), which is the single
-- retrieval hard filter". subject discrimination is now the embedding's job. See the
-- seamless-tile spec (docs/spec/motif-library-and-multicolor.md, D10/D13/D16) and the
-- declarative schema supabase/schemas/81_motifs.sql.
--
-- `part` and `subject` carried no CHECK/FK, so a plain rename suffices (no data coercion).
-- The (subject, part) composite hard-filter index is replaced by a (scope) index;
-- variant_group + (later) ivfflat(embedding) carry the real query load.

ALTER TABLE public.motifs RENAME COLUMN part TO scope;

DROP INDEX IF EXISTS public.motifs_subject_part_idx;
CREATE INDEX motifs_scope_idx ON public.motifs (scope);
