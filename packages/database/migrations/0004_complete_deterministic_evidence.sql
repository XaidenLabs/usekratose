ALTER TABLE version_snapshots
  ADD COLUMN IF NOT EXISTS program_executable boolean NOT NULL DEFAULT true;

ALTER TABLE security_events
  DROP CONSTRAINT IF EXISTS security_events_type_check;

ALTER TABLE security_events
  ADD CONSTRAINT security_events_type_check
  CHECK (
    type IN (
      'PROGRAM_UPGRADED',
      'AUTHORITY_CHANGED',
      'PROGRAM_BECAME_IMMUTABLE',
      'OWNER_CHANGED',
      'IDL_CHANGED',
      'INSTRUCTION_ADDED',
      'INSTRUCTION_REMOVED',
      'INSTRUCTION_CHANGED',
      'VERIFICATION_STALE'
    )
  );

CREATE TABLE IF NOT EXISTS program_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (
    artifact_type IN ('IDL', 'SOURCE_METADATA', 'VERIFIED_BUILD', 'REPOSITORY')
  ),
  artifact_hash text,
  source_url text,
  revision text,
  verification_status text NOT NULL,
  artifact_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_snapshot_id, artifact_type)
);

CREATE INDEX IF NOT EXISTS program_artifacts_snapshot_idx
  ON program_artifacts (program_snapshot_id, artifact_type);
