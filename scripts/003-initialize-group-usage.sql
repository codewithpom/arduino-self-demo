-- Initialize group_usage records for all existing groups
INSERT INTO public.group_usage (id, busy)
SELECT id, false FROM public.grouping
ON CONFLICT (id) DO NOTHING;
