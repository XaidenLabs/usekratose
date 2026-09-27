INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'program-artifacts',
  'program-artifacts',
  false,
  20971520,
  ARRAY[
    'application/json',
    'application/octet-stream',
    'text/plain',
    'text/x-rust'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can read their program artifacts" ON storage.objects;
CREATE POLICY "Users can read their program artifacts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'program-artifacts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can upload their program artifacts" ON storage.objects;
CREATE POLICY "Users can upload their program artifacts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'program-artifacts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update their program artifacts" ON storage.objects;
CREATE POLICY "Users can update their program artifacts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'program-artifacts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'program-artifacts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete their program artifacts" ON storage.objects;
CREATE POLICY "Users can delete their program artifacts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'program-artifacts'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
