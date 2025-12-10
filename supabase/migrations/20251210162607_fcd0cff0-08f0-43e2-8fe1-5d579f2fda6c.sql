-- Create table for storing exam comparisons
CREATE TABLE public.exam_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_ids UUID[] NOT NULL,
  comparison_result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own comparisons"
ON public.exam_comparisons
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparisons"
ON public.exam_comparisons
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
ON public.exam_comparisons
FOR DELETE
USING (auth.uid() = user_id);