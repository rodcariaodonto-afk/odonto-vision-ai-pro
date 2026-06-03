
-- 1) Admins can read case_feedback
CREATE POLICY "Admins can view all feedback"
ON public.case_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Admins can read cephalometric planning audit log
CREATE POLICY "Admins can view all planning audit logs"
ON public.cephalometric_planning_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Owners can delete their own cephalometric analyses (right to erasure)
CREATE POLICY "cephalo_delete_own"
ON public.cephalometric_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4) Storage DELETE policy for cephalometric-images bucket (owner-scoped via folder)
CREATE POLICY "cephalo_storage_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cephalometric-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5) Lock down cephalometric_analysis_history client writes.
-- Writes must come from triggers/edge functions running as service_role, which
-- bypasses RLS. Explicitly deny INSERT/UPDATE/DELETE from anon/authenticated roles.
CREATE POLICY "ceph_hist_no_client_insert"
ON public.cephalometric_analysis_history
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "ceph_hist_no_client_update"
ON public.cephalometric_analysis_history
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "ceph_hist_no_client_delete"
ON public.cephalometric_analysis_history
FOR DELETE
TO authenticated, anon
USING (false);
