UPDATE public.ai_generation_logs
SET ai_model = 'openai'
WHERE ai_model = 'gemini';
