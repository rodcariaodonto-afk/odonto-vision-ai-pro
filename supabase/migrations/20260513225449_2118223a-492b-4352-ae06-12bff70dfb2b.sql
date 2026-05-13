
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.governance_export_scope AS ENUM ('user','account','case');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.governance_export_status AS ENUM ('pending','processing','completed','failed','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_severity AS ENUM ('info','warn','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsr_type AS ENUM ('access','rectification','portability','deletion','anonymization','restriction','consent_revocation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dsr_status AS ENUM ('open','in_progress','completed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_type AS ENUM ('image_upload','ai_processing','clinical_storage','support','product_improvement','communications');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_status AS ENUM ('granted','revoked','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.legal_basis AS ENUM ('consent','contract','legal_obligation','legitimate_interest','vital_interest','public_task');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deletion_status AS ENUM ('pending','confirmed','executed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ data_exports ============
CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  case_id uuid,
  requested_by uuid NOT NULL,
  scope public.governance_export_scope NOT NULL DEFAULT 'user',
  status public.governance_export_status NOT NULL DEFAULT 'pending',
  format text NOT NULL DEFAULT 'json',
  file_url text,
  storage_path text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own exports" ON public.data_exports
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = requested_by);
CREATE POLICY "Admins manage exports" ON public.data_exports
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  severity public.audit_severity NOT NULL DEFAULT 'info',
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);

CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
-- Inserts são feitos via service-role nas Edge Functions; sem policy para usuários.

-- ============ data_subject_requests ============
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  subject_email text NOT NULL,
  request_type public.dsr_type NOT NULL,
  linked_resource_type text,
  linked_resource_id text,
  status public.dsr_status NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  assigned_to uuid,
  description text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own DSR" ON public.data_subject_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own DSR" ON public.data_subject_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage DSR" ON public.data_subject_requests
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_dsr_updated
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ consents ============
CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type public.consent_type NOT NULL,
  consent_status public.consent_status NOT NULL DEFAULT 'pending',
  consent_source text NOT NULL DEFAULT 'profile',
  consent_given_at timestamptz,
  consent_revoked_at timestamptz,
  legal_basis public.legal_basis NOT NULL DEFAULT 'consent',
  ai_processing_allowed boolean NOT NULL DEFAULT false,
  clinical_data_processing_allowed boolean NOT NULL DEFAULT false,
  data_origin text,
  privacy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_type)
);
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consents" ON public.consents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consents" ON public.consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own consents" ON public.consents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage consents" ON public.consents
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_consents_updated
  BEFORE UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ retention_policies (singleton) ============
CREATE TABLE IF NOT EXISTS public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  case_retention_days integer NOT NULL DEFAULT 30,
  image_retention_days integer NOT NULL DEFAULT 30,
  export_expiration_days integer NOT NULL DEFAULT 7,
  support_retention_days integer NOT NULL DEFAULT 365,
  clinical_access_logging boolean NOT NULL DEFAULT true,
  ai_clinical_use_allowed boolean NOT NULL DEFAULT true,
  export_allowed_roles text[] NOT NULL DEFAULT ARRAY['admin'],
  deletion_allowed_roles text[] NOT NULL DEFAULT ARRAY['admin'],
  anonymization_strategy text NOT NULL DEFAULT 'hash_pii',
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read policy" ON public.retention_policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage policy" ON public.retention_policies
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.retention_policies (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- ============ deletion_queue ============
CREATE TABLE IF NOT EXISTS public.deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  user_id uuid,
  scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  requested_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz,
  executed_at timestamptz,
  status public.deletion_status NOT NULL DEFAULT 'pending',
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deletion queue" ON public.deletion_queue
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own deletion queue" ON public.deletion_queue
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = requested_by);

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('governance-exports','governance-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read governance exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'governance-exports' AND public.has_role(auth.uid(),'admin'));
