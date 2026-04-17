DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'ai_generation_logs'
      AND constraint_name = 'ai_generation_logs_parent_work_id_fkey'
  ) THEN
    ALTER TABLE public.ai_generation_logs
      ADD CONSTRAINT "ai_generation_logs_parent_work_id_fkey"
      FOREIGN KEY (parent_work_id) REFERENCES public.ai_generation_logs(work_id);
  END IF;
END $$;
