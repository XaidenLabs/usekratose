CREATE TABLE IF NOT EXISTS program_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  current_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  evidence_hash text NOT NULL,
  evidence_input jsonb NOT NULL,
  analysis jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    program_id,
    current_snapshot_id,
    provider,
    model,
    prompt_version,
    evidence_hash
  )
);

CREATE INDEX IF NOT EXISTS program_ai_analyses_program_created_idx
  ON program_ai_analyses (program_id, created_at DESC);

ALTER TABLE program_ai_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE program_ai_analyses FROM anon, authenticated;
