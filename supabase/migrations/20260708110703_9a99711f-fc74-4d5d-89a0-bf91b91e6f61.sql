
CREATE POLICY "Ops team reads ops-attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ops-attachments' AND public.has_ops_access(auth.uid()));

CREATE POLICY "Ops team uploads ops-attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ops-attachments' AND public.has_ops_access(auth.uid()));

CREATE POLICY "Ops team updates ops-attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ops-attachments' AND public.has_ops_access(auth.uid()));

CREATE POLICY "Ops team deletes ops-attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ops-attachments' AND public.has_ops_access(auth.uid()));
