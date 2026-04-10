INSERT INTO public.pricing_constants (key, amount, category)
VALUES ('REFORM_WIDTH_COST', 0, 'reform')
ON CONFLICT (key) DO NOTHING;
