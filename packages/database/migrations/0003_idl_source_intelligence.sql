ALTER TABLE version_snapshots
  ADD COLUMN IF NOT EXISTS idl jsonb,
  ADD COLUMN IF NOT EXISTS source_repository_url text,
  ADD COLUMN IF NOT EXISTS source_revision text,
  ADD COLUMN IF NOT EXISTS source_verification_status text NOT NULL
    DEFAULT 'unavailable';

ALTER TABLE version_snapshots
  DROP CONSTRAINT IF EXISTS version_snapshots_source_verification_status_check;

ALTER TABLE version_snapshots
  ADD CONSTRAINT version_snapshots_source_verification_status_check
  CHECK (
    source_verification_status IN ('unavailable', 'unverified', 'verified')
  );
