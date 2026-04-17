-- Tabela de correções e feedback dos laudos
-- Cada registro = um dentista corrigindo um campo do laudo gerado pela IA
CREATE TABLE public.case_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campo corrigido
  field_name    TEXT NOT NULL,  -- ex: 'achados_radiograficos', 'diagnosticos_diferenciais'
  field_index   INTEGER,        -- índice dentro de um array, se aplicável

  -- Conteúdo original da IA vs correção do dentista
  original_value  TEXT,
  corrected_value TEXT NOT NULL,

  -- Tipo de feedback
  feedback_type TEXT NOT NULL DEFAULT 'correction',
  -- 'correction'  = conteúdo errado, substituído
  -- 'addition'    = achado que a IA não viu, adicionado pelo dentista
  -- 'removal'     = achado que a IA inventou, removido pelo dentista
  -- 'severity'    = gravidade/urgência errada

  -- Metadados
  exam_category TEXT,           -- radiografia / tomografia / laboratorial / foto
  notes         TEXT,           -- observação livre do dentista
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.case_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
ON public.case_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.case_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.case_feedback FOR DELETE
USING (auth.uid() = user_id);

-- Admins podem ver tudo (para treinar o modelo futuramente)
CREATE POLICY "Admins can view all feedback"
ON public.case_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Índice para busca por caso e por tipo
CREATE INDEX case_feedback_case_idx ON public.case_feedback (case_id);
CREATE INDEX case_feedback_type_idx ON public.case_feedback (feedback_type, exam_category);
CREATE INDEX case_feedback_user_idx ON public.case_feedback (user_id, created_at DESC);

-- Adicionar coluna reviewer_notes na tabela cases
-- Para salvar o laudo revisado pelo modelo critic
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS reviewer_analysis  JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reviewer_flags     TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_score       INTEGER DEFAULT NULL;
-- review_score: 0-100, estimativa de confiança do revisor

COMMENT ON TABLE public.case_feedback IS
  'Correções feitas pelos dentistas nos laudos gerados pela IA. Alimenta o fine-tuning futuro.';
COMMENT ON COLUMN public.cases.reviewer_analysis IS
  'Revisão crítica gerada pelo modelo claude-3-5-sonnet (critic) após o GPT-4o.';
COMMENT ON COLUMN public.cases.reviewer_flags IS
  'Alertas levantados pelo revisor: achados suspeitos, inconsistências, omissões.';
COMMENT ON COLUMN public.cases.review_score IS
  'Score de confiança 0-100 estimado pelo revisor sobre a qualidade do laudo.';
