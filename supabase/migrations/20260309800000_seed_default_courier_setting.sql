INSERT INTO public.admin_settings (key, value)
VALUES ('default_courier_company', '')
ON CONFLICT (key) DO NOTHING;
