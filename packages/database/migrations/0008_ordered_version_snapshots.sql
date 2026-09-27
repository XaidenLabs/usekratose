ALTER TABLE version_snapshots
  DROP CONSTRAINT IF EXISTS version_snapshots_program_id_fingerprint_key;

CREATE INDEX IF NOT EXISTS version_snapshots_program_fingerprint_idx
  ON version_snapshots (program_id, fingerprint);
