UPDATE public.design_chat_sessions s
SET repeat_tile_work_id = null
WHERE repeat_tile_work_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.ai_generation_logs l
    WHERE l.work_id = s.repeat_tile_work_id
  );

UPDATE public.design_chat_sessions s
SET accent_tile_work_id = null
WHERE accent_tile_work_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.ai_generation_logs l
    WHERE l.work_id = s.accent_tile_work_id
  );

ALTER TABLE public.design_chat_sessions
  ADD CONSTRAINT design_chat_sessions_repeat_tile_work_id_fkey
  FOREIGN KEY (repeat_tile_work_id)
  REFERENCES public.ai_generation_logs(work_id)
  ON DELETE SET NULL;

ALTER TABLE public.design_chat_sessions
  ADD CONSTRAINT design_chat_sessions_accent_tile_work_id_fkey
  FOREIGN KEY (accent_tile_work_id)
  REFERENCES public.ai_generation_logs(work_id)
  ON DELETE SET NULL;
