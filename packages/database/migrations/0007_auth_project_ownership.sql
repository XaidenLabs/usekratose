ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_user_idx
  ON projects (owner_user_id)
  WHERE owner_user_id IS NOT NULL;
