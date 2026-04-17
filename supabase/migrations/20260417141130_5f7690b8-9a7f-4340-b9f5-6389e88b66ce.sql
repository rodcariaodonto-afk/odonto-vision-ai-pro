CREATE TABLE IF NOT EXISTS public.case_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name      TEXT NOT NULL,
  field_index     INTEGER,
  original_value  TEXT,
  corrected_value TEXT NOT NULL,
  feedback_type   TEXT NOT NULL DEFAULT 'correction',
  exam_category   TEXT,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
ON public.case_feedback FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.case_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.case_feedback FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS case_feedback_case_idx ON public.case_feedback (case_id);
CREATE INDEX IF NOT EXISTS case_feedback_user_idx ON public.case_feedback (user_id, created_at DESC);

ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS reviewer_flags    TEXT[]  DEFAULT NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS review_score      INTEGER DEFAULT NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS reviewer_analysis JSONB   DEFAULT NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS patient_folder    TEXT    DEFAULT NULL;