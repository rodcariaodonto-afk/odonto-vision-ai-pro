-- ─── Clínicas parceiras ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  plan        TEXT NOT NULL DEFAULT 'basic'
                CHECK (plan IN ('basic','professional','enterprise')),
  active      BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── API Keys ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,   -- SHA256 da key completa
  key_preview     TEXT NOT NULL,          -- ex: ovpro_live_abc...xyz
  environment     TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live','test')),
  plan            TEXT NOT NULL DEFAULT 'basic'
                    CHECK (plan IN ('basic','professional','enterprise')),
  monthly_limit   INTEGER DEFAULT 100,    -- NULL = ilimitado (enterprise)
  usage_count     INTEGER NOT NULL DEFAULT 0,
  usage_reset_at  TIMESTAMP WITH TIME ZONE NOT NULL
                    DEFAULT date_trunc('month', now()) + interval '1 month',
  active          BOOLEAN NOT NULL DEFAULT true,
  last_used_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Log de uso da API ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  clinic_id       UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  endpoint        TEXT NOT NULL DEFAULT '/api/v1/analyze',
  status_code     INTEGER NOT NULL,
  exam_category   TEXT,
  processing_ms   INTEGER,
  ip_address      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Configurações de webhook ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Webhook Principal',
  url             TEXT NOT NULL,
  secret_hash     TEXT NOT NULL,   -- SHA256 do secret para assinar payloads
  secret_preview  TEXT NOT NULL,   -- primeiros 8 chars para identificação
  active          BOOLEAN NOT NULL DEFAULT true,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status     TEXT,            -- 'success' | 'failed' | 'pending'
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clinics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Apenas admins acessam (via is_admin() ou user_roles)
CREATE POLICY "Admins manage clinics"
ON public.clinics FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins manage api_keys"
ON public.api_keys FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins manage api_usage"
ON public.api_usage FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins manage webhook_configs"
ON public.webhook_configs FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS api_keys_clinic_idx    ON public.api_keys (clinic_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx      ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_usage_key_idx      ON public.api_usage (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_clinic_idx   ON public.api_usage (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_clinic_idx     ON public.webhook_configs (clinic_id);

-- ─── Trigger de updated_at em clinics ────────────────────────────────────────
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
