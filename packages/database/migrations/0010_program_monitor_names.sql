ALTER TABLE organization_program_monitors
  ADD COLUMN IF NOT EXISTS display_name text;

UPDATE organization_program_monitors monitors
SET display_name = programs.address
FROM programs
WHERE monitors.program_id = programs.id
  AND monitors.display_name IS NULL;

ALTER TABLE organization_program_monitors
  ALTER COLUMN display_name SET NOT NULL;

ALTER TABLE organization_program_monitors
  ADD CONSTRAINT organization_program_monitors_display_name_length
  CHECK (char_length(display_name) BETWEEN 1 AND 80);
