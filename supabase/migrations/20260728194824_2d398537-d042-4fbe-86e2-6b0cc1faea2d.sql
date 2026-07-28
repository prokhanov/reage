-- Пути в бакете: {user_id}/{analysis_id}/{version}.pdf
-- Запись/удаление — только service_role (политик для authenticated нет).

CREATE POLICY "Patients can read own report pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Staff can read patient report pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-pdfs'
    AND has_admin_permission(auth.uid(), 'patients'::admin_module)
    AND is_patient(((storage.foldername(name))[1])::uuid)
  );