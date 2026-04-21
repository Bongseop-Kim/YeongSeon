ALTER TABLE public.ai_generation_logs
ADD COLUMN render_backend text
CHECK (render_backend IN ('ip_adapter', 'img2img', 'nano_banana_edit'));
