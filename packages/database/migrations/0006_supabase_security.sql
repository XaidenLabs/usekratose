DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'programs',
    'organization_program_monitors',
    'version_snapshots',
    'change_events',
    'security_events',
    'program_artifacts',
    'projects',
    'alert_destinations',
    'alert_deliveries',
    'api_keys',
    'api_rate_limits',
    'api_request_logs',
    'ai_explanations',
    'program_claims',
    'product_metrics'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;
  END LOOP;
END
$$;
