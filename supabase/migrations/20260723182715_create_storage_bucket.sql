/*
# Create storage bucket for tenant documents

Creates a public storage bucket 'tenant-docs' for uploading tenant documents
(facturas de servicios, comprobantes de pago).

Security: Files are accessed via signed URLs only, so they are not publicly listable.
RLS policies on tenant_documents table control who can see which files.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-docs', 'tenant-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "tenant_upload_own_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT t.id::text FROM tenants t WHERE t.user_id = auth.uid()
    )
  );

-- Allow tenants to read their own files
CREATE POLICY "tenant_read_own_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT t.id::text FROM tenants t WHERE t.user_id = auth.uid()
    )
  );

-- Allow staff to read all files
CREATE POLICY "staff_read_all_docs_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-docs'
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff'
    )
  );

-- Allow staff to delete files
CREATE POLICY "staff_delete_docs_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-docs'
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff'
    )
  );
