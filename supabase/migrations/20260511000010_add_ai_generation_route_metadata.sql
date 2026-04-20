ALTER TABLE public.ai_generation_logs
ADD COLUMN route text CHECK (route IN ('openai', 'fal_tiling', 'fal_edit')),
ADD COLUMN route_reason text,
ADD COLUMN route_signals jsonb,
ADD COLUMN base_image_work_id text REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
ADD COLUMN fal_request_id text,
ADD COLUMN seed bigint;
