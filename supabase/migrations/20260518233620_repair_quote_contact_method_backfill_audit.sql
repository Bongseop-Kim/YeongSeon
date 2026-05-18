BEGIN;

CREATE TABLE IF NOT EXISTS public.quote_request_contact_migration_audit (
  quote_request_id uuid NOT NULL,
  observed_contact_method text NOT NULL,
  observed_contact_value varchar NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_request_contact_migration_audit_pkey PRIMARY KEY (quote_request_id),
  CONSTRAINT quote_request_contact_migration_audit_quote_request_id_fkey
    FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE public.quote_request_contact_migration_audit
  IS 'Stores quote request contact values that were already migrated from kakao to email but do not look like email addresses before masking them for review and rollback.';

ALTER TABLE public.quote_request_contact_migration_audit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_suspect_count integer;
BEGIN
  SELECT count(*)
  INTO v_suspect_count
  FROM public.quote_requests qr
  WHERE qr.contact_method = 'email'
    AND btrim(qr.contact_value) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

  RAISE NOTICE 'quote_requests suspect email contact_value rows before masking: %', v_suspect_count;
END;
$$;

INSERT INTO public.quote_request_contact_migration_audit (
  quote_request_id,
  observed_contact_method,
  observed_contact_value,
  reason
)
SELECT
  qr.id,
  qr.contact_method,
  qr.contact_value,
  'contact_method is email but contact_value does not match email format after kakao contact method removal'
FROM public.quote_requests qr
WHERE qr.contact_method = 'email'
  AND btrim(qr.contact_value) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
ON CONFLICT (quote_request_id) DO NOTHING;

UPDATE public.quote_requests qr
SET contact_value = concat('quote-', replace(qr.id::text, '-', ''), '@contact-migration.invalid')
FROM public.quote_request_contact_migration_audit audit
WHERE audit.quote_request_id = qr.id
  AND qr.contact_method = 'email'
  AND btrim(qr.contact_value) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

COMMIT;
