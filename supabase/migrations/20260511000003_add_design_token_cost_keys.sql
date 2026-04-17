INSERT INTO public.admin_settings (key, value) VALUES
  ('design_token_cost_openai_analysis',        '1'),
  ('design_token_cost_openai_render_standard', '5'),
  ('design_token_cost_openai_render_high',     '12'),
  ('design_token_cost_gemini_analysis',        '1'),
  ('design_token_cost_gemini_render_standard', '3'),
  ('design_token_cost_gemini_render_high',     '3'),
  ('design_token_cost_fal_analysis',           '1'),
  ('design_token_cost_fal_render_standard',    '5'),
  ('design_token_cost_fal_render_high',        '12')
ON CONFLICT (key) DO NOTHING;
