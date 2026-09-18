ALTER TABLE version_snapshots
  ADD COLUMN IF NOT EXISTS program_owner text NOT NULL
    DEFAULT 'BPFLoaderUpgradeab1e11111111111111111111111',
  ADD COLUMN IF NOT EXISTS idl_hash text,
  ADD COLUMN IF NOT EXISTS idl_instructions jsonb,
  ADD COLUMN IF NOT EXISTS metadata_hash text,
  ADD COLUMN IF NOT EXISTS source_reference_hash text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS trusted_fingerprint text;

ALTER TABLE version_snapshots
  DROP CONSTRAINT IF EXISTS version_snapshots_verification_status_check;

ALTER TABLE version_snapshots
  ADD CONSTRAINT version_snapshots_verification_status_check
  CHECK (verification_status IN ('unknown', 'trusted', 'verified', 'stale'));

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'PROGRAM_UPGRADED',
      'AUTHORITY_CHANGED',
      'OWNER_CHANGED',
      'IDL_CHANGED',
      'INSTRUCTION_ADDED',
      'INSTRUCTION_REMOVED',
      'VERIFICATION_STALE'
    )
  ),
  severity text NOT NULL CHECK (
    severity IN ('info', 'low', 'medium', 'high', 'critical')
  ),
  previous_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id),
  current_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id),
  evidence jsonb NOT NULL,
  rule_engine_version text NOT NULL,
  detected_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (previous_snapshot_id, current_snapshot_id, type)
);

CREATE INDEX IF NOT EXISTS security_events_program_detected_idx
  ON security_events (program_id, detected_at DESC, id DESC);
