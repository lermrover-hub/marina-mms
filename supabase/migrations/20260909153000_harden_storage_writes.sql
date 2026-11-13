-- The application now uploads/removes marina files through an authenticated
-- server route using service_role. Remove the legacy public ALL policy.

DROP POLICY IF EXISTS marina_files_all_access ON storage.objects;

UPDATE storage.buckets
SET public = false
WHERE id = 'marina-files';
