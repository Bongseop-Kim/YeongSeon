DELETE FROM public.admin_settings
WHERE key IN (
  'design_token_cost_gemini_analysis',
  'design_token_cost_gemini_render_standard',
  'design_token_cost_gemini_render_high'
);
