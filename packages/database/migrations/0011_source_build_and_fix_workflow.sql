CREATE TABLE IF NOT EXISTS program_source_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('upload', 'github')),
  repository_url text,
  repository_owner text,
  repository_name text,
  base_branch text,
  revision text,
  github_installation_id bigint,
  status text NOT NULL DEFAULT 'connected' CHECK (
    status IN ('connected', 'needs_installation', 'error')
  ),
  idl jsonb,
  idl_hash text,
  binary_hash text,
  binary_size integer CHECK (binary_size IS NULL OR binary_size >= 0),
  binary_matches_deployment boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, program_id)
);

CREATE TABLE IF NOT EXISTS program_source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES program_source_workspaces(id) ON DELETE CASCADE,
  path text NOT NULL,
  object_path text,
  source_hash text NOT NULL,
  size integer NOT NULL CHECK (size >= 0),
  language text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, path)
);

CREATE TABLE IF NOT EXISTS program_fix_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES program_ai_analyses(id) ON DELETE CASCADE,
  finding_id text NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (
    status IN ('proposed', 'applied', 'rejected')
  ),
  patches jsonb NOT NULL,
  branch_name text,
  pull_request_url text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, finding_id)
);

CREATE INDEX IF NOT EXISTS program_source_workspaces_program_idx
  ON program_source_workspaces (program_id, project_id);
CREATE INDEX IF NOT EXISTS program_source_files_workspace_idx
  ON program_source_files (workspace_id, path);
CREATE INDEX IF NOT EXISTS program_fix_reviews_analysis_idx
  ON program_fix_reviews (analysis_id, status);

ALTER TABLE program_source_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_fix_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE program_source_workspaces FROM anon, authenticated;
REVOKE ALL ON TABLE program_source_files FROM anon, authenticated;
REVOKE ALL ON TABLE program_fix_reviews FROM anon, authenticated;
