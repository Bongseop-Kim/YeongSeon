ALTER TABLE public.ai_generation_logs
DROP CONSTRAINT ai_generation_logs_route_check;

ALTER TABLE public.ai_generation_logs
ADD CONSTRAINT ai_generation_logs_route_check
CHECK (route IN ('openai', 'fal_tiling', 'fal_edit', 'fal_controlnet', 'fal_inpaint'));

ALTER TABLE public.ai_generation_logs
DROP CONSTRAINT ai_generation_logs_render_backend_check;

ALTER TABLE public.ai_generation_logs
ADD CONSTRAINT ai_generation_logs_render_backend_check
CHECK (render_backend IN ('ip_adapter', 'img2img', 'nano_banana_edit', 'controlnet', 'flux_fill'));
