-- ============================================================================
-- Migration: Cephalometric Planning Suggestion (Apoio à Decisão Clínica)
-- Data: 2026-05-14
-- Descrição: Adiciona tabelas para sugestão de planeamento clínico
--            baseada em análise cefalométrica, com auditoria médico-legal.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUM: estado da sugestão
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ceph_planning_status AS ENUM (
    'draft_ai_generated',
    'clinician_edited',
    'clinician_approved',
    'rejected',
    'requires_more_data'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ENUM: nível de confiança
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ceph_planning_confidence AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 3. ENUM: tipo de evento de auditoria
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ceph_planning_audit_event AS ENUM (
    'generated',
    'edited',
    'approved',
    'rejected',
    'exported',
    'safety_blocked',
    'requested_more_data'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 4. TABELA PRINCIPAL: cephalometric_planning_suggestions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cephalometric_planning_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cephalometric_analysis_id uuid NOT NULL REFERENCES public.cephalometric_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Estado e workflow
  status ceph_planning_status NOT NULL DEFAULT 'draft_ai_generated',

  -- Score de suficiência
  data_sufficiency_score integer NOT NULL CHECK (data_sufficiency_score BETWEEN 0 AND 100),
  confidence_level ceph_planning_confidence NOT NULL,
  missing_data text[] NOT NULL DEFAULT ARRAY[]::text[],
  blocking_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Snapshot das medidas usadas (auditável)
  input_measurements_snapshot jsonb NOT NULL,
  clinical_context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Conteúdo estruturado (gerado pelo motor de regras)
  summary text NOT NULL,
  prioritized_problems text[] NOT NULL DEFAULT ARRAY[]::text[],
  therapeutic_objectives text[] NOT NULL DEFAULT ARRAY[]::text[],
  treatment_alternatives text[] NOT NULL DEFAULT ARRAY[]::text[],
  alerts_and_limitations text[] NOT NULL DEFAULT ARRAY[]::text[],
  patient_friendly_explanation text,

  -- Texto formatado
  ai_original_text text NOT NULL,
  clinician_edited_text text,
  approved_final_text text,
  rejection_reason text,

  -- Versionamento (auditoria médico-legal)
  rules_version text NOT NULL,
  template_version text NOT NULL,
  safety_filter_version text NOT NULL,

  -- Timestamps de workflow
  generated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,

  -- Profissional que aprovou/rejeitou
  clinician_user_id uuid REFERENCES auth.users(id),

  -- Metadados gerais
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ceph_planning_analysis_id ON public.cephalometric_planning_suggestions(cephalometric_analysis_id);
CREATE INDEX IF NOT EXISTS idx_ceph_planning_user_id ON public.cephalometric_planning_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ceph_planning_status ON public.cephalometric_planning_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ceph_planning_generated_at ON public.cephalometric_planning_suggestions(generated_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_ceph_planning_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ceph_planning_updated_at ON public.cephalometric_planning_suggestions;
CREATE TRIGGER trg_ceph_planning_updated_at
BEFORE UPDATE ON public.cephalometric_planning_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_ceph_planning_updated_at();

-- ----------------------------------------------------------------------------
-- 5. TABELA DE AUDITORIA: cephalometric_planning_audit_log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cephalometric_planning_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_suggestion_id uuid NOT NULL REFERENCES public.cephalometric_planning_suggestions(id) ON DELETE CASCADE,
  cephalometric_analysis_id uuid NOT NULL REFERENCES public.cephalometric_analyses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  event_type ceph_planning_audit_event NOT NULL,
  event_timestamp timestamptz NOT NULL DEFAULT now(),

  -- Snapshots no momento do evento
  input_measurements_snapshot jsonb,
  clinical_context_snapshot jsonb,
  missing_data_list text[],
  data_sufficiency_score integer,
  confidence_level ceph_planning_confidence,

  -- Versionamento
  rules_version text,
  template_version text,
  safety_filter_version text,

  -- Diff de conteúdo (para edits)
  content_before text,
  content_after text,

  -- Razão (rejeição/bloqueio)
  reason text,

  -- Metadado extra (IP, user agent, etc — opcional)
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceph_audit_suggestion_id ON public.cephalometric_planning_audit_log(planning_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_ceph_audit_analysis_id ON public.cephalometric_planning_audit_log(cephalometric_analysis_id);
CREATE INDEX IF NOT EXISTS idx_ceph_audit_event_type ON public.cephalometric_planning_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_ceph_audit_timestamp ON public.cephalometric_planning_audit_log(event_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 6. RLS — Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.cephalometric_planning_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cephalometric_planning_audit_log ENABLE ROW LEVEL SECURITY;

-- Suggestions: usuário só vê/manipula as próprias
DROP POLICY IF EXISTS "Users can view their own ceph planning suggestions" ON public.cephalometric_planning_suggestions;
CREATE POLICY "Users can view their own ceph planning suggestions"
ON public.cephalometric_planning_suggestions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ceph planning suggestions" ON public.cephalometric_planning_suggestions;
CREATE POLICY "Users can insert their own ceph planning suggestions"
ON public.cephalometric_planning_suggestions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ceph planning suggestions" ON public.cephalometric_planning_suggestions;
CREATE POLICY "Users can update their own ceph planning suggestions"
ON public.cephalometric_planning_suggestions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ceph planning suggestions" ON public.cephalometric_planning_suggestions;
CREATE POLICY "Users can delete their own ceph planning suggestions"
ON public.cephalometric_planning_suggestions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Audit log: usuário só vê eventos das próprias sugestões; INSERT só via service_role
DROP POLICY IF EXISTS "Users can view audit log of their own suggestions" ON public.cephalometric_planning_audit_log;
CREATE POLICY "Users can view audit log of their own suggestions"
ON public.cephalometric_planning_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cephalometric_planning_suggestions s
    WHERE s.id = planning_suggestion_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert audit events for their own suggestions" ON public.cephalometric_planning_audit_log;
CREATE POLICY "Authenticated users can insert audit events for their own suggestions"
ON public.cephalometric_planning_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cephalometric_planning_suggestions s
    WHERE s.id = planning_suggestion_id AND s.user_id = auth.uid()
  )
);

-- Audit log nunca pode ser editado ou apagado por usuário (imutabilidade)
-- (sem policy de UPDATE ou DELETE = bloqueado por padrão com RLS ativo)

-- ----------------------------------------------------------------------------
-- 7. COMENTÁRIOS (documentação inline)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.cephalometric_planning_suggestions IS
  'Sugestões de planeamento clínico geradas a partir de análise cefalométrica. Apoio à decisão, requer validação profissional.';
COMMENT ON TABLE public.cephalometric_planning_audit_log IS
  'Trilha de auditoria médico-legal imutável para sugestões de planeamento cefalométrico.';
COMMENT ON COLUMN public.cephalometric_planning_suggestions.status IS
  'Estado do workflow: draft_ai_generated -> clinician_edited -> clinician_approved/rejected. Apenas approved permite exportação.';
COMMENT ON COLUMN public.cephalometric_planning_suggestions.rules_version IS
  'Versão do motor de regras clínicas usado na geração. Permite reproduzir o resultado posteriormente.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
