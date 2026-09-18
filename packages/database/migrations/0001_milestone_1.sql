CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster text NOT NULL CHECK (cluster IN ('devnet', 'mainnet-beta')),
  address text NOT NULL,
  programdata_address text NOT NULL,
  loader text NOT NULL DEFAULT 'loader-v3' CHECK (loader = 'loader-v3'),
  monitoring_status text NOT NULL CHECK (
    monitoring_status IN ('baselining', 'healthy', 'degraded', 'unsupported')
  ),
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cluster, address)
);

CREATE TABLE IF NOT EXISTS organization_program_monitors (
  organization_id text NOT NULL,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, program_id)
);

CREATE TABLE IF NOT EXISTS version_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  program_address text NOT NULL,
  programdata_address text NOT NULL,
  deployment_slot bigint NOT NULL,
  observed_slot bigint NOT NULL,
  executable_hash text NOT NULL,
  account_data_hash text NOT NULL,
  executable_size integer NOT NULL CHECK (executable_size >= 0),
  upgrade_authority text,
  fingerprint text NOT NULL,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS version_snapshots_program_observed_idx
  ON version_snapshots (program_id, observed_slot DESC, id DESC);

CREATE TABLE IF NOT EXISTS change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  from_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id),
  to_snapshot_id uuid NOT NULL REFERENCES version_snapshots(id),
  event_types text[] NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'high')),
  facts jsonb NOT NULL,
  rule_engine_version text NOT NULL,
  detected_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_snapshot_id, to_snapshot_id)
);

CREATE INDEX IF NOT EXISTS change_events_program_detected_idx
  ON change_events (program_id, detected_at DESC, id DESC);
