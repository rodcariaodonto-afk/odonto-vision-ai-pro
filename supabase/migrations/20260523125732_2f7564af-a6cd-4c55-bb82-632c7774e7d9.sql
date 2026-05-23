
-- 1. UPDATE policy on cephalometric-images
CREATE POLICY "cephalo_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cephalometric-images' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'cephalometric-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2. governance-exports: allow users to read their own folder
CREATE POLICY "governance_exports_user_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'governance-exports'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. Fix search_path on update_cephalo_updated_at
CREATE OR REPLACE FUNCTION public.update_cephalo_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Revoke EXECUTE from anon on SECURITY DEFINER functions (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_all_cases() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_test_user_analyses(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_subscription_analyses(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refresh_subscription_period(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_cases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_test_user_analyses(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_subscription_analyses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_subscription_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
